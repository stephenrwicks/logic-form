

class LogicForm extends HTMLElement {

    // json config
    #config: Config;
    // field name => internal object
    #fields: Record<string, FieldInternal> = {};
    // field name => subscriber names
    #watchers: Record<string, Set<string>> = {};
    // snapshots
    #states: Record<string, Record<string, Value>> = {};
    #metaKeys = new Set(['a', 'c', 'v', 'x']);
    #integerAllowedKeys = new Set([
        'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End',
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
    ]);
    #integers = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']);
    #valueGetterObject: any;
    #isInit = false;

    form = document.createElement('form');

    constructor(config: Config) {
        super();
        this.#config = config;
    }

    #isNumeric(val: unknown): val is Number {
        return typeof val === 'number' && !Number.isNaN(val) && isFinite(val);
    };

    #isInteger(val: unknown): val is Number {
        return this.#isNumeric(val) && Number.isSafeInteger(val);
    }

    #isDecimal(val: unknown): val is Number {
        return this.#isNumeric(val) && !Number.isSafeInteger(val);
    }

    #isVarRef(val: unknown): val is VarRef {
        return !!val && typeof val === 'object' && 'var' in val && typeof val.var === 'string';
    }

    #isFlatStringArrayEqual(array1: string[], array2: string[]) {
        // Compare string value arrays for checkbox groups, etc. We don't care about order so we sort it first
        // Remove duplicates with Set since declaring a value twice on a group should still work the same as once.
        array1 = [...new Set(array1)].toSorted();
        array2 = [...new Set(array2)].toSorted();
        return array1.length === array2.length && array1.every((item, i) => item === array2[i]);
    }

    #buildField(f: Field) {
        if (f.name in this.#fields) throw new Error(`"${f.name}" exists in the config twice. Can't have two fields named the same.`)
        const id = `_${f.type}_${crypto.randomUUID()}`;
        const div = document.createElement('div');
        div.dataset.fieldName = f.name;
        div.dataset.fieldType = f.type;
        const label = document.createElement('label');
        const labelSpan = document.createElement('span');
        const requiredSpan = document.createElement('span');
        label.htmlFor = id;
        labelSpan.textContent = f.label.trim();
        requiredSpan.textContent = ' *';
        requiredSpan.style.color = 'red';
        requiredSpan.ariaHidden = 'true';
        label.replaceChildren(labelSpan, requiredSpan);
        let input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLFieldSetElement;
        let getValue: () => Value;
        let setValue: (val: any) => any;
        let setRequired: (bool: boolean) => void;
        let eventToListenFor: 'change' | 'input' = 'change';

        if (f.type === 'textbox' || f.type === 'textarea' || f.type === 'numerictextbox') {
            eventToListenFor = 'input'
            input = document.createElement(f.type === 'textarea' ? 'textarea' : 'input');
            if (f.type === 'textbox' || f.type === 'numerictextbox') (input as HTMLInputElement).type = 'text';
            input.id = id;
            input.name = f.name;
            if (f.value) input.defaultValue = f.value ?? '';
            if (f.placeholder) input.placeholder = f.placeholder;
            if (f.maxLength && this.#isInteger(f.maxLength)) input.maxLength = f.maxLength;
            if (f.minLength && this.#isInteger(f.minLength)) input.minLength = f.minLength;
            div.replaceChildren(label, input);
            getValue = () => (input as (HTMLInputElement | HTMLTextAreaElement)).value.trim();
            setValue = (val: string) => (input as (HTMLInputElement | HTMLTextAreaElement)).value = typeof val === 'string' ? val.trim() : '';
            const whiteSpaceBlocker = () => input.setCustomValidity(!!getValue() ? '' : 'This field is required.');
            setRequired = (bool) => {
                (input as (HTMLInputElement | HTMLTextAreaElement)).required = !!bool;
                // Prevent user from entering a space to bypass required. We could use "pattern" on textboxes but not textareas.
                // Let's always remove before adding so we don't end up with 50 event listeners.
                input.removeEventListener('input', whiteSpaceBlocker);
                if (!!bool) input.addEventListener('input', whiteSpaceBlocker);
            };
            // setValid = (bool) => {
            // 	let validityMessage = '';
            // 	if (!bool) {
            // 		validityMessage = 'This field is invalid.';
            // 	}
            // 	input.setCustomValidity(validityMessage);
            // };
            // handle custom validity on input or set value
        }
        else if (f.type === 'checkbox') {
            input = document.createElement('input');
            input.id = id;
            input.name = f.name;
            input.type = 'checkbox';
            input.defaultChecked = !!f.value;
            const wrapperSpan = document.createElement('span');
            wrapperSpan.replaceChildren(labelSpan, requiredSpan);
            label.replaceChildren(input, wrapperSpan);
            label.style.display = 'flex';
            div.replaceChildren(label);
            div.style.alignContent = 'end';
            getValue = () => !!(input as HTMLInputElement).checked;
            setValue = (val) => (input as HTMLInputElement).checked = !!val;
            setRequired = (bool) => (input as HTMLInputElement).required = !!bool;
        }
        else if (f.type === 'integer' || f.type === 'decimal') {

            const maxLength = this.#isInteger(f.max) ? String(f.max).length : 15;
            eventToListenFor = 'input'
            input = document.createElement('input');
            input.id = id;
            input.name = f.name;
            input.type = 'number';
            input.placeholder = f.placeholder ?? '';
            const hasMin = this.#isNumeric(f.min);
            const hasMax = this.#isNumeric(f.max);
            if (this.#isNumeric(f.value)) {
                input.defaultValue = String(f.value);
            }
            if (hasMin && hasMax && f.min! > f.max!) {
                f.max = f.min;
            }
            if (hasMax) {
                input.max = String(Math.floor(f.max!));
                //input.maxLength = input.max.length; // Doesn't work. Needs keydown handler
            }
            if (hasMin) {
                input.min = String(Math.floor(f.min!));
                //if (f.min > 0) input.minLength = input.min.length;
            }
            // set value somewhere
            // Keydown and input handlers to fix int and dec
            div.replaceChildren(label, input);

            // Browsers aren't great at making number inputs actually work so we will add some keydown help
            input.addEventListener('keydown', (e) => {
                const isPasteOrSomething = (e.ctrlKey || e.metaKey) && this.#metaKeys.has(e.key.toLowerCase());
                if (isPasteOrSomething) {

                    return;
                }
                if ((input as HTMLInputElement).value.length > maxLength && this.#integers.has(e.key)) {
                    e.preventDefault();
                }
                if (!this.#integerAllowedKeys.has(e.key)) {
                    e.preventDefault();
                }
                // Ordering of this makes no sense

            });
            // input.addEventListener('keydown', (e) => {
            // 	if ((input as HTMLInputElement).value.length >= maxLength) e.preventDefault();
            // });
            input.addEventListener('input', () => {
                // Clean on paste, drag, etc
                // We would have to ensure this fires before the updating input event or that they are the same event
                //(input as HTMLInputElement).value = (input as HTMLInputElement).value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
            });

            // Just returning strings always is probably best
            getValue = () => {
                const val = (input as HTMLInputElement).valueAsNumber;
                if (this.#isNumeric(val)) {
                    if (f.type === 'decimal') return val;
                    return Math.floor(val);
                }
                ///???
                return ''; // FormData does blank string
            };
            setRequired = (bool) => (input as HTMLInputElement).required = !!bool;
            setValue = (val: number) => {
                if (!this.#isNumeric(val)) {
                    (input as HTMLInputElement).value = '';
                    return;
                }
                (input as HTMLInputElement).valueAsNumber = f.type === 'integer' ? Math.floor(val) : val;
            };
        }
        else if (f.type === 'select') {
            input = document.createElement('select');
            input.id = id;
            input.name = f.name;
            input.add(new Option(f.placeholder || '-', '', false));
            const validValues = new Set(f.options.map(o => o.value));
            for (const option of f.options) {
                if (!option.value?.trim()) {
                    throw new Error(`select ${f.name} has an option with no value`)
                }
                const selected = option.value === f.value && validValues.has(f.value);
                input.add(new Option(option.text, option.value, selected, selected));
            }
            div.replaceChildren(label, input);
            getValue = () => validValues.has((input as HTMLSelectElement).value) ? (input as HTMLSelectElement).value : '';
            setValue = (val: string) => (input as HTMLSelectElement).value = validValues.has(val) ? val : '';
            setRequired = (bool) => (input as HTMLSelectElement).required = !!bool;
        }
        else if (f.type === 'checkboxgroup') {

            const validValues = new Set(f.options.map(o => o.value));
            const defaultSelectedValues = new Set(f.value ?? []);
            input = document.createElement('fieldset');
            input.id = id;
            const legend = document.createElement('legend');
            const requiredSpan = document.createElement('span');
            requiredSpan.textContent = ' *';
            requiredSpan.style.color = 'red';
            requiredSpan.ariaHidden = 'true';
            legend.replaceChildren(f.label.trim(), requiredSpan);
            input.append(legend);
            div.replaceChildren(input);

            const hasMin = this.#isNumeric(f.min);
            const hasMax = this.#isNumeric(f.max);
            if (hasMin && hasMax && f.min! > f.max!) {
                f.max = f.min;
            }
            const checkboxes = f.options.map(o => {
                const checkbox = document.createElement('input');
                const label = document.createElement('label');
                label.replaceChildren(checkbox, o.text);
                checkbox.type = 'checkbox';
                checkbox.name = f.name;
                checkbox.value = o.value;
                checkbox.defaultChecked = defaultSelectedValues.has(o.value);
                input.append(label);
                return checkbox;
            });
            if (typeof f.min === 'number' || typeof f.max === 'number') {

            }

            const minMax = () => {
                let validityMessage = '';
                const hasMin = this.#isInteger(f.min) || f.required;
                const hasMax = this.#isInteger(f.max);

                if (hasMin && f.min! > f.options.length) throw new Error(`${f.name} min is greater than total options`)
                if (hasMin && hasMax && f.min! > f.options.length) f.min = f.options.length;
                if (hasMin && hasMax && f.max! > f.options.length) f.max = f.options.length;
                if (hasMin && f.required && (f.min! < 1 || typeof f.min === 'undefined')) f.min = 1;
                if (hasMin && hasMax && f.min! > f.max!) f.max = f.min;

                const selectionLength = checkboxes.filter(c => c.checked && validValues.has(c.value)).length;
                const isTooFew = hasMin && selectionLength < Math.floor(f.min!);
                const isTooMany = hasMax && selectionLength > Math.floor(f.max!);

                if (hasMin && hasMax && (isTooFew || isTooMany) && f.min === f.max) {
                    validityMessage = `Select exactly ${f.min} option(s).`
                }
                else if (hasMin && hasMax && (isTooFew || isTooMany)) {
                    validityMessage = `Select ${f.min}-${f.max} option(s).`
                }
                else if (hasMin && (isTooFew || isTooMany)) {
                    validityMessage = `Select at least ${f.min} option(s).`
                }
                else if (hasMax && (isTooFew || isTooMany)) {
                    validityMessage = `Select up to ${f.max} option(s).`
                }
                if (checkboxes.length) {
                    checkboxes[0].setCustomValidity(validityMessage);
                }

                // If it is not required and is empty, it is valid. This isnt working
                if (!f.required && selectionLength === 0) checkboxes[0].setCustomValidity('');
            };
            input.addEventListener('change', minMax);
            getValue = () => checkboxes.filter(c => c.checked && validValues.has(c.value)).map(c => c.value);
            setValue = (val: string[] = []) => {
                const set = new Set(val.filter(v => validValues.has(v)));
                for (const checkbox of checkboxes) {
                    checkbox.checked = set.has(checkbox.value);
                }
            };

            setRequired = (bool: boolean) => {
                minMax();
                requiredSpan.style.display = !!bool ? '' : 'none';
            }
        }
        else if (f.type === 'radiogroup') {
            const validValues = new Set(f.options.map(o => o.value));
            input = document.createElement('fieldset');
            input.id = id;
            input.style.position = 'relative';
            const legend = document.createElement('legend');
            const requiredSpan = document.createElement('span');
            requiredSpan.textContent = ' *';
            requiredSpan.style.color = 'red';
            requiredSpan.ariaHidden = 'true';
            legend.replaceChildren(f.label.trim(), requiredSpan);
            input.append(legend);
            div.replaceChildren(input);

            // Needs styling. Could we use anchor positioning?
            const clearButton = document.createElement('button');
            clearButton.type = 'button';
            clearButton.textContent = 'Clear';
            clearButton.style.position = 'absolute';
            clearButton.style.bottom = '0';
            clearButton.style.right = '0';
            const updateClearButtonVisibility = () => clearButton.style.display = !!getValue() ? '' : 'none';
            input.addEventListener('change', () => updateClearButtonVisibility());
            clearButton.addEventListener('click', () => setValue(''));

            const radios = f.options.map(o => {
                const radio = document.createElement('input');
                const label = document.createElement('label');
                label.replaceChildren(radio, o.text);
                radio.type = 'radio';
                radio.name = f.name;
                radio.value = o.value;
                radio.defaultChecked = o.value === f.value;
                input.append(label);
                return radio;
            });

            input.append(clearButton);

            getValue = () => radios.find(r => r.checked && validValues.has(r.value))?.value ?? '';
            setValue = (val: string) => {
                for (const radio of radios) {
                    radio.checked = val === radio.value && validValues.has(val);
                }
                updateClearButtonVisibility();
            }
            setRequired = (bool) => {
                for (const radio of radios) {
                    radio.required = !!bool;
                }
                requiredSpan.style.display = !!bool ? '' : 'none';
            };
            updateClearButtonVisibility();
        }
        else if (f.type === 'list') {
            input = document.createElement('fieldset');
            input.id = id;
            const legend = document.createElement('legend');
            const requiredSpan = document.createElement('span');
            requiredSpan.textContent = ' *';
            requiredSpan.style.color = 'red';
            requiredSpan.ariaHidden = 'true';
            legend.replaceChildren(f.label.trim(), requiredSpan);
            input.append(legend);
            div.replaceChildren(input);
            const listItems: Set<ReturnType<typeof buildItem>> = new Set();
            const buildItem = (val = '') => {
                const itemDiv = document.createElement('div');
                itemDiv.style.display = 'flex';
                itemDiv.style.marginBottom = '.25rem';
                const deleteButton = document.createElement('button');
                deleteButton.type = 'button';
                deleteButton.title = 'Remove';
                deleteButton.textContent = '×';
                deleteButton.addEventListener('click', () => object.remove());
                const itemInput = document.createElement('input');
                itemInput.type = 'text';
                itemInput.value = val.trim();
                itemDiv.replaceChildren(itemInput, deleteButton);
                const object = {
                    itemDiv,
                    deleteButton,
                    get value() {
                        return itemInput.value.trim();
                    },
                    remove: () => {
                        if (this.#isInteger(f.min) && listItems.size <= f.min) return;
                        listItems.delete(object);
                        itemDiv.dispatchEvent(new Event('change', { bubbles: true }));
                        itemDiv.remove();
                    }
                };
                return object;
            };
            const addItemButton = document.createElement('button');
            addItemButton.type = 'button';
            addItemButton.textContent = 'Add';
            const addItem = (val: string) => {
                if (this.#isInteger(f.max) && listItems.size >= f.max!) return;
                const item = buildItem(val);
                listItems.add(item);
                addItemButton.before(item.itemDiv);
                item.itemDiv.dispatchEvent(new Event('change', { bubbles: true }));
            };
            addItemButton.addEventListener('click', () => addItem(''));
            input.append(addItemButton);
            const min = this.#isInteger(f.min) ? f.min : 1;
            const max = this.#isInteger(f.max) ? f.max : 20;

            getValue = () => {
                const val = [...listItems].map(item => item.value).filter(Boolean);
                if (this.#isInteger(f.max)) return val.slice(0, f.max);
                return val;
            };
            // This makes it impossible to clear properly since we always add extras
            setValue = (val: string[]) => {
                val = val.filter(Boolean);
                for (const item of listItems) item.remove();

                if (val.length > max) val.length = max;

                for (const str of val) {
                    addItem(str);
                }


                if (listItems.size < min) {
                    // Add extra blanks if necessary to hit minimum
                    const blanksToAdd = min - listItems.size;
                    for (let i = 0; i < blanksToAdd; i++) {
                        addItem('');
                    }

                    //val.push(...Array.from({ length: min - val.length }, () => ''));
                }
            };
            setRequired = () => {

            };

            input.addEventListener('change', () => {
                const isAtMin = listItems.size <= min;
                const isAtMax = listItems.size >= max;
                for (const item of listItems) {
                    item.deleteButton.style.visibility = isAtMin ? 'hidden' : '';
                }
                addItemButton.disabled = isAtMax;
            });
            setValue(Array.isArray(f.value) ? f.value : []);
        }
        else if (f.type === 'date') {
            input = document.createElement('input');
            input.type = 'date';
            input.id = id;
            div.replaceChildren(label, input);

            setValue = () => {

            };
            setRequired = () => {

            };
        }
        else {
            throw new Error(`field "${(f as Field).name}" type invalid`);
        }

        // Stretch across entire grid if it's conditionally displayed. Otherwise, you get fields moving around left/right
        //if (typeof f.visible === 'boolean' || Array.isArray(f.visible)) {
        //div.style.gridColumn = '1/-1';
        // div.style.transition = 'height .1s ease-out';
        // div.style.overflow = 'hidden';
        //}

        for (const fieldName of this.#getFieldNamesToWatch(f)) {
            if (!(this.#watchers[fieldName] instanceof Set)) {
                this.#watchers[fieldName] = new Set();
            }
            this.#watchers[fieldName].add(f.name);
        }

        input.addEventListener(eventToListenFor, () => {
            this.#fireRecursiveDependencyUpdate(f.name);
        });

        let _visible = true;
        let _disabled = false;
        let _required = false;
        //let _valid = true;

        const cl = this;
        const internals: FieldInternal = {
            get type() {
                return f.type;
            },
            get name() {
                return f.name;
            },
            get value() {
                if (_disabled || !_visible) return cl.#getEmptyValue(this);
                return getValue();
            },
            set value(val: Value) {
                setValue(val);
                cl.#fireRecursiveDependencyUpdate(f.name);
            },
            //visible: true,
            get visible() {
                // These probably don't need to be getters
                return _visible;
            },
            get disabled() {
                return _disabled;
            },
            get required() {
                return _required;
            },
            get el() {
                return div;
            },
            updateState() {
                _visible = cl.#evaluateProperty(f.visible, true);
                _disabled = cl.#evaluateProperty(f.disabled, false);
                _required = cl.#evaluateProperty(f.required, false);

                if (_visible) {
                    div.style.display = '';
                    input.disabled = false || _disabled;
                    //div.style.height = '';
                }
                else {
                    div.style.display = 'none';
                    //div.style.height = '0px';
                }
                requiredSpan.style.display = _required ? '' : 'none';
                setRequired(_required);
                input.disabled = _disabled || !_visible;
                //setValid(_valid);
            },
        }

        this.#fields[f.name] = internals;

        return internals;
    }

    #getEmptyValue(f: FieldInternal) {
        if (f.type === 'checkbox') return false;
        if (f.type === 'checkboxgroup') return [] as string[];
        if (f.type === 'list') {
            return [] as string[];
        }
        return '';
    }

    /** Repetitive loop to return a set of strings. Can probably be simplified if I look up by key */
    #getFieldNamesToWatch(field: Field): Set<string> {
        const resultSet = new Set<string>();

        const collectVars = (rule: Rule) => {
            if ('==' in rule) {
                for (const item of rule['==']) if (this.#isVarRef(item)) resultSet.add(item.var);
            }
            else if ('!=' in rule) {
                for (const item of rule['!=']) if (this.#isVarRef(item)) resultSet.add(item.var);
            }
            else if ('>' in rule) {
                for (const item of rule['>']) if (this.#isVarRef(item)) resultSet.add(item.var);
            }
            else if ('<' in rule) {
                for (const item of rule['<']) if (this.#isVarRef(item)) resultSet.add(item.var);
            }
            else if ('>=' in rule) {
                for (const item of rule['>=']) if (this.#isVarRef(item)) resultSet.add(item.var);
            }
            else if ('<=' in rule) {
                for (const item of rule['<=']) if (this.#isVarRef(item)) resultSet.add(item.var);
            }
            else if ('not' in rule) {
                collectVars(rule.not);
            }
            else if ('and' in rule) {
                for (const r of rule.and) collectVars(r);
            }
            else if ('or' in rule) {
                for (const r of rule.or) collectVars(r);
            }
            // in, !in, etc.
        };

        const collectAllVarNames = (rules: Rule[] | boolean | undefined) => {
            // A property like "required" might not exist or just be a boolean so we do this
            if (!Array.isArray(rules)) return;
            for (const r of rules) {
                collectVars(r);
            }
        };

        // Get dependencies from each thing
        collectAllVarNames(field.visible);
        collectAllVarNames(field.required);
        collectAllVarNames(field.disabled);
        return resultSet;
    }

    /** Update dependent fields, then update fields that are dependent on those, etc.
        * This can be batched probably.
    */
    #fireRecursiveDependencyUpdate(fieldName: string) {
        if (!(this.#watchers[fieldName] instanceof Set)) return;
        for (const watcherName of this.#watchers[fieldName]) {
            this.#fields[watcherName].updateState();
            if (this.#watchers[watcherName] instanceof Set) {
                this.#fireRecursiveDependencyUpdate(watcherName);
            }
        }
    }

    /** 
     * Figures out what a property (required, visible, etc.) should be based on current form state.
     * Returns default if not defined. This is constantly run as the form updates
    */
    #evaluateProperty(propertyVal: Rule[] | boolean | undefined, defaultValue: boolean): boolean {
        console.log('Evaluating.')
        if (typeof propertyVal === 'boolean') return propertyVal;
        if (Array.isArray(propertyVal)) return propertyVal.every(rule => this.#evaluateRule(rule));
        return defaultValue;
    };

    /** Makes a rule comparison: field value against a set value or another field value. 
        * A little repetitive, but it's easier to understand doing the operations one by one like this compared to a lookup
        * Also needs some type checking, maybe, or else you can do weird things like 'a' < 'aa' etc? This is probably ok
    *  Does check for arrays*/

    #evaluateRule(rule: Rule): boolean {
        if ('==' in rule) {
            const [left, right] = rule['=='];
            const side1 = this.#readRuleSide(left);
            const side2 = this.#readRuleSide(right);
            if (Array.isArray(side1) && Array.isArray(side2)) return this.#isFlatStringArrayEqual(side1, side2);
            return side1 === side2;
        }
        if ('!=' in rule) {
            const [left, right] = rule['!='];
            const side1 = this.#readRuleSide(left);
            const side2 = this.#readRuleSide(right);
            if (Array.isArray(side1) && Array.isArray(side2)) return this.#isFlatStringArrayEqual(side1, side2) === false;
            return this.#readRuleSide(left) !== this.#readRuleSide(right);
        }
        if ('>' in rule) {
            const [left, right] = rule['>'];
            return this.#readRuleSide(left) > this.#readRuleSide(right);
        }
        if ('<' in rule) {
            const [left, right] = rule['<'];
            return this.#readRuleSide(left) < this.#readRuleSide(right);
        }
        if ('>=' in rule) {
            const [left, right] = rule['>='];
            return this.#readRuleSide(left) >= this.#readRuleSide(right);
        }
        if ('<=' in rule) {
            const [left, right] = rule['<='];
            return this.#readRuleSide(left) <= this.#readRuleSide(right);
        }
        if ('not' in rule) {
            // A not rule looks like { not: { '==': [{ var: 'fieldName' }, 'fieldValue'] } }
            // True if it returns false
            return this.#evaluateRule(rule.not) === false;
        }
        // These are collections of other rules, so we use recursion here
        if ('and' in rule) {
            // Everything has to return true
            return rule.and.every((r) => this.#evaluateRule(r));
        }
        if ('or' in rule) {
            // True if one returns true
            return rule.or.some((r) => this.#evaluateRule(r));
        }

        return true;
    };

    /** 
        Interprets a side of a rule so we can compare the two sides
    */
    #readRuleSide(side: VarRef | Value): Value {
        if (this.#isVarRef(side)) {
            return this.#fields[side.var].value;
        }
        // Is already some kind of value so we return that.
        return side;
    }


    #titleEl = document.createElement('p');
    #submitButton = document.createElement('button');
    #clearButton = document.createElement('button');
    #resetButton = document.createElement('button');
    #buttonRow = document.createElement('div');

    connectedCallback() {
        if (this.#isInit) return;

        if (this.dataset.config) {
            this.setConfig(JSON.parse(this.dataset.config));
            this.removeAttribute('data-config');
        }

        for (const attr of ['action', 'enctype', 'method', 'novalidate', 'target', 'autocomplete']) {
            if (this.hasAttribute(attr)) {
                const val = this.getAttribute(attr) ?? '';
                this.removeAttribute(attr);
                this.form.setAttribute(attr, val);
            }
        }


        this.#titleEl.style.gridColumn = '1/-1';

        this.#submitButton.type = 'submit';
        this.#submitButton.textContent = 'Submit';

        this.#clearButton.type = 'button';
        this.#clearButton.textContent = 'Clear';
        this.#clearButton.addEventListener('click', () => this.clear());

        this.#resetButton.type = 'button';
        this.#resetButton.textContent = 'Reset';
        this.#resetButton.addEventListener('click', () => this.reset());

        this.#buttonRow.replaceChildren(this.#resetButton, this.#clearButton, this.#submitButton);


        this.style.display = 'contents';
        this.replaceChildren(this.form);
        this.#isInit = true;

    }

    get value() {
        return this.#valueGetterObject;
    }
    set value(val: Record<string, Value>) {
        for (const key in val) {
            this.#fields[key].value = val[key];
        }
    }
    getValue() {
        const result: Record<string, Value> = {};
        for (const f of Object.values(this.#fields)) {
            if (f.disabled || !f.visible) continue;
            result[f.name] = f.value;
        }
        return result;
    }
    getJson() {
        return JSON.stringify(this.#valueGetterObject);
    }
    getFormData() {
        return new FormData(this.form);
    }
    clear() {
        for (const f of Object.values(this.#fields)) {
            f.value = this.#getEmptyValue(f);
        }
        return this.#valueGetterObject;
    }
    reset() {
        this.form.reset();
        for (const fieldInternal of Object.values(this.#fields)) {
            fieldInternal.updateState();
        }
        return this.#valueGetterObject;
    }

    saveState(name: string) {
        const clone = structuredClone(this.#valueGetterObject);
        this.#states[name] = clone;
        return clone;
    }
    loadState(name: string) {
        const value = this.#states[name];
        if (!value) return;
        this.value = value;
        return structuredClone(value);
    }
    setConfig(config: Config) {
        this.#config = config;
        this.form.replaceChildren();
        this.form.append(this.#titleEl);
        this.#titleEl.textContent = config.title?.trim() ?? '';

        this.#valueGetterObject = Object.create(null);
        for (const f of this.#config.fields) {
            const fieldInternal = this.#buildField(f);
            // Several layers of getter/setters here
            // This is sort of a proxy. It's exposed to the consumer as a layer to access the internal value get/set,
            // but the rest of the internal object is never exposed
            Object.defineProperty(this.#valueGetterObject, f.name, {
                get() {
                    return fieldInternal.value;
                },
                set(value: Value) {
                    fieldInternal.value = value;
                },
                enumerable: true,
            });
            this.form.append(fieldInternal.el);
        }

        for (const fieldInternal of Object.values(this.#fields)) {
            fieldInternal.updateState();
        }

        this.form.append(this.#buttonRow);
    }

}

customElements.define('logic-form', LogicForm);


type Field = Textbox | Textarea | Checkbox | Select | NumericTextbox | Integer | Decimal | CheckboxGroup | RadioGroup | List | DateInput;

type FieldBase = {
    type: 'textbox' | 'textarea' | 'checkbox' | 'select' | 'numerictextbox' | 'integer' | 'decimal' | 'checkboxgroup' | 'radiogroup' | 'list' | 'date';
    name: string;
    label: string;
    visible?: Rule[] | boolean;
    required?: Rule[] | boolean;
    disabled?: Rule[] | boolean;
}

type Textbox = FieldBase & {
    type: 'textbox';
    value?: string;
    placeholder?: string;
    minLength?: number;
    maxLength?: number;
}

type Textarea = FieldBase & {
    type: 'textarea';
    value?: string;
    placeholder?: string;
    minLength?: number;
    maxLength?: number;
}

type Checkbox = FieldBase & {
    type: 'checkbox';
    value?: boolean;
}

type NumericTextbox = FieldBase & {
    type: 'numerictextbox';
    value?: string;
    placeholder?: string;
    minLength?: number;
    maxLength?: number;
}

type Integer = FieldBase & {
    type: 'integer';
    value?: number;
    placeholder?: string;
    min?: number;
    max?: number;
}

type Decimal = FieldBase & {
    type: 'decimal';
    value?: number;
    placeholder?: string;
    min?: number;
    max?: number;
}

type Select = FieldBase & {
    type: 'select';
    options: {
        text: string;
        value: string;
        //disabled?: Rule[] | boolean;
    }[];
    value?: string;
    placeholder?: string;
}

type CheckboxGroup = FieldBase & {
    type: 'checkboxgroup';
    options: {
        text: string;
        value: string;
        //disabled?: Rule[] | boolean;
    }[];
    min?: number;
    max?: number
    value?: string[];
}

type RadioGroup = FieldBase & {
    type: 'radiogroup';
    options: {
        text: string;
        value: string;
        //disabled?: Rule[] | boolean;
    }[];
    value?: string;
}

type List = FieldBase & {
    type: 'list';
    value?: string[];
    min?: number;
    max?: number;
}

type DateInput = FieldBase & {
    type: 'date';
    value?: string;
    min?: string;
    max?: string;
}

type Value = boolean | string | number | string[];
type VarRef = { var: string }; // e.g. { "var": "fieldName" }
type EqualsRule = { '==': [Value | VarRef, Value | VarRef] };
type NotEqualsRule = { '!=': [Value | VarRef, Value | VarRef] };
type LessThanRule = { '<': [Value | VarRef, Value | VarRef] };
type LessThanOrEqualToRule = { '<=': [Value | VarRef, Value | VarRef] };
type GreaterThanRule = { '>': [Value | VarRef, Value | VarRef] };
type GreaterThanOrEqualToRule = { '>=': [Value | VarRef, Value | VarRef] };

// metarules
type AndRule = { and: Rule[] };
type OrRule = { or: Rule[] };
type NotRule = { not: Rule }; // { not: { '==': [{ var: 'fieldName' }, 'fieldValue'] } }

type Rule = EqualsRule | NotEqualsRule | LessThanRule | LessThanOrEqualToRule | GreaterThanRule | GreaterThanOrEqualToRule | AndRule | OrRule | NotRule;

type Config = {
    title: string;
    fields: Field[];
    //fields: Field[] | Section[];
}

type Section = Config & {
    visible?: Rule[] | boolean;
    // repeatable
}

type FieldInternal = {
    readonly type: FieldBase['type'];
    readonly el: HTMLDivElement;
    readonly name: string;
    readonly visible: boolean;
    readonly required: boolean;
    readonly disabled: boolean;
    //readonly readonly: boolean;
    value: Value;
    updateState(): void;
};




// Stuff to work on:
// List input clearing bugs
// Date input
// Fix int, decimal, numeric inputs
// Hidden input
// Readonly state
// Custom event bubbling
// Live form builder
// Disabled options
// Rule-able min and max
// Batch evaluation and DOM updates
// Radio clear button styling, List button styling
// in and !in rules
// Select optgroups
// Custom errors
// Combobox input - Can reuse most of my custom one.
// Sections
// Conditional sections
// Repeatable sections