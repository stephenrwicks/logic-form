

class LogicForm extends HTMLElement {

    // json config
    #config: Config;
    // field name => internal object
    #fields: Record<string, FieldInternal> = {};
    // snapshots
    #snapshots: Record<string, Record<string, Value>> = {};
    #metaKeys = new Set(['a', 'c', 'v', 'x']);
    #integerAllowedKeys = new Set([
        'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End',
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
    ]);
    #integers = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']);
    #valueGetterObject: any;
    #isInit = false;

    #titleEl = document.createElement('p');
    #submitButton = document.createElement('button');
    #clearButton = document.createElement('button');
    #resetButton = document.createElement('button');
    #buttonRow = document.createElement('div');

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

    #isRuleWithReturnValue(val: unknown): val is RuleWithReturnValue {
        return !!val && typeof val === 'object' && 'if' in val && 'then' in val && typeof val.if === 'object';
    }

    #isFlatStringArrayEqual(array1: string[], array2: string[]) {
        // Compare string value arrays for checkbox groups, etc. We don't care about order so we sort it first
        // Remove duplicates with Set since declaring a value twice on a group should still work the same as once.
        array1 = [...new Set(array1)].toSorted();
        array2 = [...new Set(array2)].toSorted();
        return array1.length === array2.length && array1.every((item, i) => item === array2[i]);
    }

    #fixMinMax(f: Field) {
        if (!(f.type === 'integer' || f.type === 'decimal' || f.type === 'list' || f.type === 'checkboxgroup')) return;
        if (this.#isNumeric(f.min) && this.#isNumeric(f.max)) {
            if (f.min > f.max) f.min = f.max;
        }
        if (f.type !== 'decimal' && this.#isNumeric(f.min)) f.min = Math.floor(f.min);
        if (f.type !== 'decimal' && this.#isNumeric(f.max)) f.max = Math.floor(f.max);
        if (this.#isNumeric(f.min) && f.min < 0) f.min = 0;
        if (this.#isNumeric(f.max) && f.max < 1) f.max = 1;
    };

    #buildSection() {

    }

    #buildField(f: Field) {

        if (f.name in this.#fields) throw new Error(`"${f.name}" exists in the config twice. Can't have two fields named the same.`);
        const cl = this;

        // Hidden input returns early because it doesn't need most of the same features
        if (f.type === 'hidden') {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = f.name;
            const hasDefaultValueRule = 'defaultValue' in f && this.#isRuleWithReturnValue(f.defaultValue);
            let setDefaultValue: () => void;
            if (hasDefaultValueRule) {
                setDefaultValue = () => {
                    input.defaultValue = String(this.#resolveRuleWithReturnValue(f.defaultValue as RuleWithReturnValue));
                };
            }
            else if (typeof f.defaultValue === 'string' || typeof f.defaultValue === 'number') {
                input.defaultValue = String(f.defaultValue);
            }
            let _disabled = false;
            const internals: FieldInternal = {
                get isTouched() {
                    return false;
                },
                get type() {
                    return 'hidden' as const;
                },
                get name() {
                    return f.name;
                },
                get value() {
                    if (_disabled) return '';
                    return input.value;
                },
                set value(val: Value) {
                    input.value = String(val || '');
                    cl.#update();
                },
                get visible() {
                    return !_disabled;
                },
                get disabled() {
                    return _disabled;
                },
                get required() {
                    return false;
                },
                get readonly() {
                    return _disabled;
                },
                get el() {
                    return input;
                },
                updateState() {
                    if ('disabled' in f) {
                        _disabled = cl.#evaluateBooleanProperty(f.disabled, false);
                    }
                    input.disabled = _disabled;
                    setDefaultValue?.();
                },
            }

            this.#fields[f.name] = internals;
            return internals;
        }

        const whiteSpaceBlocker = () => input.setCustomValidity(!!getValue() ? '' : 'This field is required.');
        this.#fixMinMax(f);
        //this.#fixMinlengthMaxlength(f);

        let eventToListenFor: 'change' | 'input' = 'change';
        const id = `_${f.type}_${crypto.randomUUID()}`;
        const div = document.createElement('div');
        div.dataset.fieldName = f.name;
        div.dataset.fieldType = f.type;
        const label = document.createElement('label');
        const labelSpan = document.createElement('span');
        const requiredSpan = document.createElement('span');
        label.htmlFor = id;
        requiredSpan.textContent = ' *';
        requiredSpan.ariaHidden = 'true';
        label.replaceChildren(labelSpan, requiredSpan);
        let input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLFieldSetElement;

        let getValue: () => Value;
        let setValue: (val: any) => void;

        // Plain booleans:
        let setRequired: (bool: boolean) => void;
        let setReadonly: (bool: boolean) => void;

        // Properties that could be rules have a return value:
        let setLabel: () => void;
        let setDefaultValue: () => void;
        let setPlaceholder: () => void;
        let setMin: () => void;
        let setMax: () => void;
        let setMinLength: () => void;
        let setMaxLength: () => void;

        // const ruleSetup = {
        //     hasLabelRule: 'label' in f && this.#isRuleWithReturnValue(f.label),
        //     hasDefaultValueRule: 'defaultValue' in f && this.#isRuleWithReturnValue(f.defaultValue),
        //     hasPlaceholderRule: 'placeholder' in f && this.#isRuleWithReturnValue(f.placeholder),
        //     hasMinRule: 'min' in f && this.#isRuleWithReturnValue(f.min),
        //     hasMaxRule: 'max' in f && this.#isRuleWithReturnValue(f.max),
        //     hasMinLengthRule: 'minLength' in f && this.#isRuleWithReturnValue(f.minLength),
        //     hasMaxLengthRule: 'maxLength' in f && this.#isRuleWithReturnValue(f.maxLength),
        // };

        const hasLabelRule = 'label' in f && this.#isRuleWithReturnValue(f.label);
        const hasDefaultValueRule = 'defaultValue' in f && this.#isRuleWithReturnValue(f.defaultValue);
        const hasPlaceholderRule = 'placeholder' in f && this.#isRuleWithReturnValue(f.placeholder);
        const hasMinRule = 'min' in f && this.#isRuleWithReturnValue(f.min);
        const hasMaxRule = 'max' in f && this.#isRuleWithReturnValue(f.max);
        const hasMinLengthRule = 'minLength' in f && this.#isRuleWithReturnValue(f.minLength);
        const hasMaxLengthRule = 'maxLength' in f && this.#isRuleWithReturnValue(f.maxLength);

        // Use this same pattern for each of these. Define the function if it is a rule. Otherwise, just set it.
        if (hasLabelRule) {
            setLabel = () => {
                labelSpan.textContent = String(this.#resolveRuleWithReturnValue(f.label as RuleWithReturnValue)) ?? '';
            };
        }
        else if (typeof f.label === 'string') {
            f.label = f.label.trim();
            labelSpan.textContent = f.label as string;
        }

        if (f.type === 'textbox' || f.type === 'textarea' || f.type === 'numerictextbox') {
            eventToListenFor = 'input'
            input = document.createElement(f.type === 'textarea' ? 'textarea' : 'input');
            if (f.type === 'textbox' || f.type === 'numerictextbox') (input as HTMLInputElement).type = 'text';
            input.id = id;
            input.name = f.name;
            if (f.maxLength && this.#isInteger(f.maxLength)) input.maxLength = f.maxLength;
            if (f.minLength && this.#isInteger(f.minLength)) input.minLength = f.minLength;
            div.replaceChildren(label, input);
            getValue = () => (input as (HTMLInputElement | HTMLTextAreaElement)).value.trim();

            if (hasDefaultValueRule) {
                setDefaultValue = () => {
                    (input as (HTMLInputElement | HTMLTextAreaElement)).defaultValue = String(this.#resolveRuleWithReturnValue(f.defaultValue as RuleWithReturnValue));
                };
            }
            else if (typeof f.defaultValue === 'string' || typeof f.defaultValue === 'number') {
                (input as (HTMLInputElement | HTMLTextAreaElement)).defaultValue = String(f.defaultValue || '');
            }
            if (hasPlaceholderRule) {
                setPlaceholder = () => {
                    (input as HTMLInputElement | HTMLTextAreaElement).placeholder = String(this.#resolveRuleWithReturnValue(f.placeholder as RuleWithReturnValue));
                }
            }
            else if (typeof f.placeholder === 'string') {
                input.placeholder = f.placeholder;
            }
            if (hasMinLengthRule) {
                setMinLength = () => {
                    (input as HTMLInputElement | HTMLTextAreaElement).minLength = Number(this.#resolveRuleWithReturnValue(f.minLength as RuleWithReturnValue));
                }
            }
            else if (this.#isInteger(f.minLength)) {
                input.minLength = Number(f.minLength);
            }
            if (hasMaxLengthRule) {
                setMaxLength = () => {
                    (input as HTMLInputElement | HTMLTextAreaElement).maxLength = Number(this.#resolveRuleWithReturnValue(f.maxLength as RuleWithReturnValue));
                }
            }
            else if (this.#isInteger(f.maxLength)) {
                input.maxLength = Number(f.maxLength);
            }

            setValue = (val: string) => {
                (input as (HTMLInputElement | HTMLTextAreaElement)).value = typeof val === 'string' ? val.trim() : '';
            };
            setRequired = (bool) => {
                (input as (HTMLInputElement | HTMLTextAreaElement)).required = !!bool;
                // Prevent user from entering a space to bypass required. We could use "pattern" on textboxes but not textareas.
                if (!!bool) input.addEventListener('input', whiteSpaceBlocker);
            };
            setReadonly = (bool) => {
                (input as (HTMLInputElement | HTMLTextAreaElement)).readOnly = !!bool;
            };


            if (f.type === 'numerictextbox') {
                // todo
                input.inputMode = 'numeric';
                (input as HTMLInputElement).addEventListener('input', (e) => {
                    const data = (e as any).data;
                    if (!data) return;
                });
                (input as HTMLInputElement).addEventListener('keydown', (e) => {
                    if (this.#integerAllowedKeys.has(e.key)) return;
                    e.preventDefault();
                });
            }
        }
        else if (f.type === 'checkbox') {
            input = document.createElement('input');
            input.id = id;
            input.name = f.name;
            input.type = 'checkbox';
            input.defaultChecked = !!f.defaultValue;
            const wrapperSpan = document.createElement('span');
            wrapperSpan.replaceChildren(labelSpan, requiredSpan);
            label.replaceChildren(input, wrapperSpan);
            div.replaceChildren(label);
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



            if (hasDefaultValueRule) {
                setDefaultValue = () => {
                    (input as (HTMLInputElement | HTMLTextAreaElement)).defaultValue = String(this.#resolveRuleWithReturnValue(f.defaultValue as RuleWithReturnValue));
                };
            }
            else if (typeof f.defaultValue === 'string' || typeof f.defaultValue === 'number' && this.#isNumeric(f.defaultValue)) {
                (input as (HTMLInputElement | HTMLTextAreaElement)).defaultValue = String(f.defaultValue || '');
            }
            if (hasPlaceholderRule) {
                setPlaceholder = () => {
                    (input as HTMLInputElement).placeholder = String(this.#resolveRuleWithReturnValue(f.placeholder as RuleWithReturnValue));
                }
            }
            else if (typeof f.placeholder === 'string') {
                input.placeholder = f.placeholder;
            }

            // const hasMin = this.#isNumeric(f.min);
            // const hasMax = this.#isNumeric(f.max);

            if (hasMinRule) {
                setMin = () => {
                    const min = this.#resolveRuleWithReturnValue(f.min as RuleWithReturnValue);
                    (input as HTMLInputElement).min = this.#isInteger(min) ? String(min) : '';
                }
            }
            else {
                (input as HTMLInputElement).min = this.#isInteger(f.min) ? String(f.min) : '';
            }
            if (hasMaxRule) {
                setMax = () => {
                    const max = this.#resolveRuleWithReturnValue(f.max as RuleWithReturnValue);
                    (input as HTMLInputElement).max = this.#isInteger(max) ? String(max) : '';
                }
            }
            else {
                (input as HTMLInputElement).max = this.#isInteger(f.max) ? String(f.max) : '';
            }




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
            setReadonly = (bool) => {
                (input as HTMLInputElement).readOnly = !!bool;
            };
        }
        else if (f.type === 'select') {
            input = document.createElement('select');
            input.id = id;
            input.name = f.name;
            const validValues = new Set(f.options.map(o => o.value));
            for (const option of f.options) {
                if (typeof option.value === 'undefined') {
                    throw new Error(`select ${f.name} has an option with no value`)
                }
                input.add(new Option(option.text, option.value));
            }
            div.replaceChildren(label, input);
            getValue = () => validValues.has((input as HTMLSelectElement).value) ? (input as HTMLSelectElement).value : '';
            setDefaultValue = () => {
                if (typeof f.defaultValue === 'string') {

                    for (const option of (input as HTMLSelectElement).options) {
                        option.defaultSelected = option.value === f.defaultValue && validValues.has(f.defaultValue);
                        //option.selected = option.value === f.defaultValue && validValues.has(f.defaultValue);
                    }
                }
                else if (this.#isRuleWithReturnValue(f.defaultValue)) {
                    const resolved = String(this.#resolveRuleWithReturnValue(f.defaultValue));
                    for (const option of (input as HTMLSelectElement).options) {
                        option.defaultSelected = option.value === resolved && validValues.has(resolved);
                    }
                }
            };
            setValue = (val: string) => {
                if (!validValues.has(val)) return;
                (input as HTMLSelectElement).value = val;
            }
            setRequired = (bool) => (input as HTMLSelectElement).required = !!bool;
        }
        else if (f.type === 'checkboxgroup') {

            const validValues = new Set(f.options.map(o => o.value));
            const defaultSelectedValues = new Set(f.defaultValue ?? []);
            input = document.createElement('fieldset');
            input.id = id;
            const legend = document.createElement('legend');
            legend.replaceChildren(labelSpan, requiredSpan);
            input.append(legend);
            div.replaceChildren(input);

            const checkboxes = f.options.map(o => {
                const checkbox = document.createElement('input');
                const label = document.createElement('label');
                const checkboxId = `_${crypto.randomUUID()}`;
                checkbox.id = checkboxId;
                label.htmlFor = checkboxId;
                label.replaceChildren(checkbox, o.text);
                checkbox.type = 'checkbox';
                checkbox.name = f.name;
                checkbox.value = o.value;
                input.append(label);
                return checkbox;
            });
            let min: number;
            let max: number;
            if (this.#isInteger(f.min)) min = f.min;
            if (this.#isInteger(f.max)) max = f.max;

            const minMaxValidation = () => {
                let validityMessage = '';
                const hasMin = this.#isInteger(min) || f.required;
                const hasMax = this.#isInteger(max);

                if (hasMin && min! > f.options.length) throw new Error(`${f.name} min is greater than total options`)
                if (hasMin && hasMax && min! > f.options.length) min = f.options.length;
                if (hasMin && hasMax && max! > f.options.length) max = f.options.length;
                if (hasMin && f.required && (min! < 1 || typeof min === 'undefined')) min = 1;
                if (hasMin && hasMax && min! > max!) f.max = min;

                const selectionLength = checkboxes.filter(c => c.checked && validValues.has(c.value)).length;
                const isTooFew = hasMin && selectionLength < Math.floor(min!);
                const isTooMany = hasMax && selectionLength > Math.floor(max!);

                if (hasMin && hasMax && (isTooFew || isTooMany) && min === max) {
                    validityMessage = `Select exactly ${min} option(s).`
                }
                else if (hasMin && hasMax && (isTooFew || isTooMany)) {
                    validityMessage = `Select ${min}-${max} option(s).`
                }
                else if (hasMin && (isTooFew || isTooMany)) {
                    validityMessage = `Select at least ${min} option(s).`
                }
                else if (hasMax && (isTooFew || isTooMany)) {
                    validityMessage = `Select up to ${max} option(s).`
                }
                if (checkboxes.length) {
                    checkboxes[0].setCustomValidity(validityMessage);
                }

                // If it is not required and is empty, it is valid. This isnt working
                if (!f.required && selectionLength === 0) checkboxes[0].setCustomValidity('');
            };
            input.addEventListener('change', minMaxValidation);
            setDefaultValue = () => {
                for (const checkbox of checkboxes) {
                    checkbox.defaultChecked = defaultSelectedValues.has(checkbox.value);
                }
            };
            getValue = () => checkboxes.filter(c => c.checked && validValues.has(c.value)).map(c => c.value);
            setValue = (val: string[] = []) => {
                const set = new Set(val.filter(v => validValues.has(v)));
                for (const checkbox of checkboxes) {
                    checkbox.checked = set.has(checkbox.value);
                }
            };
            setRequired = (bool: boolean) => {
                minMaxValidation();
                requiredSpan.style.display = !!bool ? '' : 'none';
            }
            if (hasMinRule) {
                setMin = () => {
                    min = Number(this.#resolveRuleWithReturnValue(f.min as RuleWithReturnValue));
                    // minMaxValidation();
                }
            }
            if (hasMaxRule) {
                setMax = () => {
                    max = Number(this.#resolveRuleWithReturnValue(f.max as RuleWithReturnValue));
                    // console.log({ max });
                    // minMaxValidation();
                }
            }
        }
        else if (f.type === 'radiogroup') {
            const validValues = new Set(f.options.map(o => o.value));
            input = document.createElement('fieldset');
            input.id = id;
            input.style.position = 'relative';
            const legend = document.createElement('legend');
            legend.replaceChildren(labelSpan, requiredSpan);
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
            clearButton.addEventListener('click', () => internals.value = '');

            const radios = f.options.map(o => {
                const radio = document.createElement('input');
                const label = document.createElement('label');
                label.replaceChildren(radio, o.text);
                radio.type = 'radio';
                radio.name = f.name;
                radio.value = o.value;
                //radio.defaultChecked = o.value === f.value;
                input.append(label);
                return radio;
            });

            input.append(clearButton);

            getValue = () => radios.find(r => r.checked && validValues.has(r.value))?.value ?? '';
            setDefaultValue = () => {
                for (const radio of radios) {
                    radio.defaultChecked = radio.value === f.defaultValue;
                }
            };
            setValue = (val: string) => {
                for (const radio of radios) {
                    radio.checked = val === radio.value && validValues.has(val);
                }
                updateClearButtonVisibility();
                //this.#update();
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
            eventToListenFor = 'change';
            input = document.createElement('fieldset');
            input.id = id;
            const legend = document.createElement('legend');
            const innerDiv = document.createElement('div');
            legend.replaceChildren(labelSpan, requiredSpan);
            input.append(legend, innerDiv);
            div.replaceChildren(input);

            const listItems: Set<ReturnType<typeof buildItem>> = new Set();
            const buildItem = (val = '') => {
                const itemDiv = document.createElement('div');
                itemDiv.style.display = 'flex';
                const deleteButton = document.createElement('button');
                deleteButton.type = 'button';
                deleteButton.title = 'Remove';
                deleteButton.textContent = '×';
                deleteButton.style.minWidth = '2rem';
                deleteButton.style.width = '2rem';
                const itemInput = document.createElement('input');
                itemInput.type = 'text';
                // Normalize FormData by clearing the name of empty inputs so they are not submitted.
                itemInput.addEventListener('input', () => itemInput.name = object.value ? f.name : '');
                itemInput.value = val.trim();
                itemDiv.replaceChildren(itemInput, deleteButton);
                const object = {
                    itemDiv,
                    itemInput,
                    deleteButton,
                    get value() {
                        return itemInput.value.trim();
                    },
                    remove: () => {
                        if (this.#isInteger(f.min) && listItems.size <= f.min) return;
                        listItems.delete(object);
                        itemDiv.dispatchEvent(new Event(eventToListenFor, { bubbles: true }));
                        itemDiv.remove();
                        deleteButton.removeEventListener('click', object.remove);
                    }
                };
                deleteButton.addEventListener('click', object.remove);
                return object;
            };
            const addItemButton = document.createElement('button');
            addItemButton.type = 'button';
            addItemButton.textContent = 'Add';
            addItemButton.addEventListener('click', () => addItem(''));

            const addItem = (val: string) => {
                if (this.#isInteger(f.max) && listItems.size >= f.max!) return;
                const item = buildItem(val);
                listItems.add(item);
                innerDiv.append(item.itemDiv);
                item.itemDiv.dispatchEvent(new Event('change', { bubbles: true }));
            };

            const min = this.#isInteger(f.min) ? f.min : 1;
            const max = this.#isInteger(f.max) ? f.max : 20;
            if (min !== max) innerDiv.append(addItemButton);

            getValue = () => {
                const val = [...listItems].map(item => item.value?.trim()).filter(Boolean);
                if (this.#isInteger(f.max)) return val.slice(0, f.max);
                return val;
            };
            setValue = (val: string[]) => {
                val = Array.isArray(val) ? val.filter(str => typeof str === 'string' && !!str.trim()) : [];
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

                }
            };
            setRequired = () => {
                // Some custom validity telling you how many to fill in
            };
            setReadonly = (bool) => {
                for (const item of listItems) {
                    item.itemInput.readOnly = !!bool;
                }
            };

            input.addEventListener('change', () => {
                const isAtMin = listItems.size <= min;
                const isAtMax = listItems.size >= max;
                for (const item of listItems) {
                    item.deleteButton.style.visibility = isAtMin ? 'hidden' : '';
                    item.deleteButton.disabled = isAtMin;
                }
                addItemButton.disabled = isAtMax;
            });


            if (hasMinRule) {
                setMin = () => {
                    //min = Number(this.#resolveRuleWithReturnValue(f.min as RuleWithReturnValue));
                    // minMaxValidation();
                }
            }
            if (hasMaxRule) {
                setMax = () => {
                    //max = Number(this.#resolveRuleWithReturnValue(f.max as RuleWithReturnValue));
                    // console.log({ max });
                    // minMaxValidation();
                }
            }

            // Can be removed once setDefaultValue is added
            setValue(Array.isArray(f.defaultValue) ? f.defaultValue : []);
        }
        else if (f.type === 'date') {
            input = document.createElement('input');
            input.type = 'date';
            input.id = id;
            setDefaultValue = () => {
                if (typeof f.defaultValue === 'string') {
                    (input as HTMLInputElement).defaultValue = f.defaultValue;
                }
                else if (this.#isRuleWithReturnValue(f.defaultValue)) {
                    (input as HTMLInputElement).defaultValue = String(this.#resolveRuleWithReturnValue(f.defaultValue));
                }
                else {
                    (input as HTMLInputElement).defaultValue = '';
                }
            };
            input.name = f.name;
            // Check if min/max are actually dates
            if (f.min) input.min = f.min;
            if (f.max) input.max = f.max;
            div.replaceChildren(label, input);
            getValue = () => {
                return (input as HTMLInputElement).value;
            };
            setValue = (dateString: string) => {
                (input as HTMLInputElement).value = dateString;
            };
            setRequired = (bool: boolean) => {
                (input as HTMLInputElement).required = !!bool;
                requiredSpan.style.display = !!bool ? '' : 'none';
            };
            setReadonly = (bool: boolean) => {
                (input as HTMLInputElement).readOnly = !!bool;
            };
            if (hasMinRule) {
                setMin = () => {
                }
            }
            if (hasMaxRule) {
                setMax = () => {
                }
            }


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

        input.addEventListener(eventToListenFor, () => {
            this.#update();
            this.#dispatchUpdateEvent(input);
            _isTouched = true;
        });

        let _isTouched = false;
        let _visible = true;
        let _disabled = false;
        let _required = false;
        let _readonly = false;

        const internals: FieldInternal = {
            get isTouched() {
                return _isTouched;
            },
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
                setValue(val ?? cl.#getEmptyValue(this));
                cl.#update();
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
            get readonly() {
                return _readonly;
            },
            get el() {
                return div;
            },
            updateState() {
                if ('visible' in f) {
                    _visible = cl.#evaluateBooleanProperty(f.visible, true);
                }
                if ('disabled' in f) {
                    _disabled = cl.#evaluateBooleanProperty(f.disabled, false);
                }
                if ('required' in f) {
                    _required = cl.#evaluateBooleanProperty(f.required, false);
                }
                if ('readonly' in f) {
                    _readonly = cl.#evaluateBooleanProperty(f.readonly, false);
                }

                requiredSpan.style.display = _required ? '' : 'none';
                setRequired(_required);
                input.disabled = _disabled;

                setReadonly?.(_readonly);

                // Fire updaters for rules with return values
                // If the value is not set to a rule or the property doesn't exist, these are undefined, and this is skipped.
                // Do not create these functions if the property is not a rule.
                setLabel?.();
                setDefaultValue?.();
                setPlaceholder?.();
                setMin?.();
                setMax?.();
                setMinLength?.();
                setMaxLength?.();
            },
        }

        this.#fields[f.name] = internals;

        return internals;
    }

    #getEmptyValue(f: FieldInternal): '' | [] | false {
        if (f.type === 'checkbox') return false;
        if (f.type === 'checkboxgroup' || f.type === 'list') return [];
        return '';
    }

    /** 
        Insert field values into strings so we can dynamically bind field A value into field B label, etc?
     * **/
    // #interpolate(str: string) {
    //     const a = str.indexOf('{{');
    //     const b = str.indexOf('}}');
    //     if (a === -1) return;
    //     if (b === -1) return;
    //     const fieldName = str.slice(a + 2, b);
    //     return this.#fields[fieldName].value;
    // }

    /** 
     * Pass over the entire form and reevaluate each field's state.
     * Compare the new value with the old one to determine if we should pass again to evaluate again.
     * e.g. updating hidden fields might change the value and require rules to be checked again
     * **/
    #updatePasses = 0;
    #visibilityMemo: Record<string, boolean> | null = null;
    #update(): void {
        if (this.#visibilityMemo === null) {
            this.#visibilityMemo = {};
            for (const f of Object.values(this.#fields)) {
                this.#visibilityMemo[f.name] = f.visible;
            }
        }
        const oldSnapshot = this.getValue();
        for (const f of Object.values(this.#fields)) {
            f.updateState();
        }
        const newSnapshot = this.getValue();
        const isStable = this.#isSnapshotEqual(oldSnapshot, newSnapshot);
        this.#updatePasses += 1;

        if (!isStable) {
            // Update again
            this.#update();
            return;
        }

        console.info(`Updated the form state in ${this.#updatePasses} ${this.#updatePasses > 1 ? 'passes' : 'pass'}.`);

        // We are dynamically adding and removing items from the DOM.
        // Use visibilityMemo to check if the visibility actually changed.
        // Keep track of the latest visible item to always append them in order (append after the last visible one)
        // Doing something like re-appending them all at once doesn't work because we lose focus, etc.
        let latestVisibleItem: HTMLDivElement | null = null;
        for (const f of Object.values(this.#fields)) {
            const wasVisibleBefore = this.#visibilityMemo[f.name];
            const isVisibleNow = this.#fields[f.name].visible;
            const hasChangedVisibility = wasVisibleBefore !== isVisibleNow;

            if (isVisibleNow) {
                if (hasChangedVisibility) {
                    latestVisibleItem ? latestVisibleItem.after(f.el) : this.form.append(f.el);
                }
                latestVisibleItem = f.el;
            }
            else {
                f.el.remove();
            }
        }
        this.#updatePasses = 0;
        this.#visibilityMemo = null;
    }

    /** 
        Sufficient object comparison
    * **/
    #isSnapshotEqual(oldSnapshot: Record<string, Value>, newSnapshot: Record<string, Value>): boolean {
        if (Object.keys(oldSnapshot).length !== Object.keys(newSnapshot).length) return false;
        for (const key in oldSnapshot) {
            if (Array.isArray(oldSnapshot[key]) && Array.isArray(newSnapshot[key])) {
                if (!this.#isFlatStringArrayEqual(oldSnapshot[key] as string[], newSnapshot[key] as string[])) return false;
            }
            else if (oldSnapshot[key] !== newSnapshot[key]) {
                return false;
            }
        }
        return true;
    }


    /**
        Parse if / else if / else from JSON and return the correct value based on the current form state.
     */
    #resolveRuleWithReturnValue(rule: RuleWithReturnValue): Value {
        const thenResult = this.#evaluateBooleanProperty(rule.if, false);
        if (thenResult) return rule.then;
        if (Array.isArray(rule.elseif)) {
            for (const elseifRule of rule.elseif) {
                const elseifResult = this.#evaluateBooleanProperty(elseifRule.if, false);
                if (elseifResult) return elseifRule.then;
            }
        }
        return rule.else || '';
    }

    /** 
     * Figures out what a property (required, visible, etc.) should be based on current form state.
     * Returns default if not defined. This is constantly run as the form updates
    */
    #evaluateBooleanProperty(propertyVal: boolean | BooleanExpression | AndRule | OrRule | NotRule | undefined, defaultValue: boolean): boolean {
        if (typeof propertyVal === 'boolean') return propertyVal;
        //if (Array.isArray(propertyVal)) return propertyVal.every(rule => this.#evaluateBooleanRule2(rule));
        if (typeof propertyVal === 'object' && !!propertyVal) return this.#evaluateBooleanRule(propertyVal);
        return defaultValue;
    };

    /** Makes a rule comparison: field value against a set value or another field value. 
        * A little repetitive, but it's easier to understand doing the operations one by one like this compared to a lookup
        * Also needs some type checking, maybe, or else you can do weird things like 'a' < 'aa' etc? This is probably ok
    *  Does check for arrays*/

    #evaluateBooleanRule(rule: BooleanExpression | AndRule | OrRule | NotRule): boolean {
        const isArray = Array.isArray(rule);
        if (!isArray && 'and' in rule) {
            return rule.and.every((r) => this.#evaluateBooleanRule(r));
        }
        if (!isArray && 'or' in rule) {
            return rule.or.some((r) => this.#evaluateBooleanRule(r));
        }
        if (!isArray && 'not' in rule) {
            return !this.#evaluateBooleanRule(rule.not);
        }
        const [left, operator, right] = rule;
        const leftValue: Value = typeof left === 'object' && 'field' in left ? this.#fields[left.field].value : left;
        const rightValue: Value = typeof right === 'object' && 'field' in right ? this.#fields[right.field].value : right;

        if (operator === '==') {
            if (Array.isArray(leftValue) && Array.isArray(rightValue)) return this.#isFlatStringArrayEqual(leftValue, rightValue);
            if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
                // Impossible to get here
                return leftValue.length === rightValue.length;
            }
            if (Array.isArray(leftValue) && typeof rightValue === 'number') {
                return leftValue.length === rightValue;
            }
            if (typeof leftValue === 'number' && Array.isArray(rightValue)) {
                return leftValue === rightValue.length;
            }
            return leftValue === rightValue;
        }
        if (operator === '!=') {
            if (Array.isArray(leftValue) && Array.isArray(rightValue)) return !this.#isFlatStringArrayEqual(leftValue, rightValue);
            if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
                // Impossible to get here
                return leftValue.length !== rightValue.length;
            }
            if (Array.isArray(leftValue) && typeof rightValue === 'number') {
                return leftValue.length !== rightValue;
            }
            if (typeof leftValue === 'number' && Array.isArray(rightValue)) {
                return leftValue !== rightValue.length;
            }
            return leftValue !== rightValue;
        }
        if (operator === '>') {
            if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
                return leftValue.length > rightValue.length;
            }
            if (Array.isArray(leftValue) && typeof rightValue === 'number') {
                return leftValue.length > rightValue;
            }
            if (typeof leftValue === 'number' && Array.isArray(rightValue)) {
                return leftValue > rightValue.length;
            }
            return leftValue > rightValue;
        }
        if (operator === '<') {
            if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
                return leftValue.length < rightValue.length;
            }
            if (Array.isArray(leftValue) && typeof rightValue === 'number') {
                return leftValue.length < rightValue;
            }
            if (typeof leftValue === 'number' && Array.isArray(rightValue)) {
                return leftValue < rightValue.length;
            }
            return leftValue < rightValue;
        }
        if (operator === '>=') {
            if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
                return leftValue.length >= rightValue.length;
            }
            if (Array.isArray(leftValue) && typeof rightValue === 'number') {
                return leftValue.length >= rightValue;
            }
            if (typeof leftValue === 'number' && Array.isArray(rightValue)) {
                return leftValue >= rightValue.length;
            }
            return leftValue >= rightValue;
        }
        if (operator === '<=') {
            if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
                return leftValue.length <= rightValue.length;
            }
            if (Array.isArray(leftValue) && typeof rightValue === 'number') {
                return leftValue.length <= rightValue;
            }
            if (typeof leftValue === 'number' && Array.isArray(rightValue)) {
                return leftValue <= rightValue.length;
            }
            return leftValue <= rightValue;
        }
        if (operator === 'in') {
            // Works for strings and arrays
            return ((rightValue as string | string[]).includes(leftValue as any));
        }
        if (operator === '!in') {
            return !((rightValue as string | string[]).includes(leftValue as any));
        }
        return true;
    };

    /** 
        Bubble a custom event
    */
    #dispatchUpdateEvent(input: HTMLElement | string) {
        if (typeof input === 'string') {
            this.form.dispatchEvent(new CustomEvent('logic-form-update', { bubbles: true, detail: { input } }));
            return;
        }
        input.dispatchEvent(new CustomEvent('logic-form-update', { bubbles: true, detail: { input } }));
    }
    #dispatchSubmitEvent() {
        this.form.dispatchEvent(new CustomEvent('logic-form-submit', { bubbles: true, detail: { value: this.getValue() } }));
    }

    connectedCallback() {
        if (this.#isInit) return;

        if (this.dataset.config) {
            this.setConfig(JSON.parse(this.dataset.config));
            this.removeAttribute('data-config');
        }
        else if (this.#config) {
            this.setConfig(this.#config);
        }
        else {
            throw new Error('No config');
        }

        for (const attr of ['onsubmit', 'action', 'enctype', 'method', 'novalidate', 'target', 'autocomplete']) {
            if (this.hasAttribute(attr)) {
                const val = this.getAttribute(attr) ?? '';
                this.removeAttribute(attr);
                this.form.setAttribute(attr, val);
            }
        }

        this.#submitButton.type = 'submit';
        this.#submitButton.textContent = 'Submit';

        this.#clearButton.type = 'button';
        this.#clearButton.textContent = 'Clear';
        this.#clearButton.addEventListener('click', () => this.clear());

        this.#resetButton.type = 'button';
        this.#resetButton.textContent = 'Reset';
        this.#resetButton.addEventListener('click', () => this.reset());

        this.#buttonRow.replaceChildren(this.#resetButton, this.#clearButton, this.#submitButton);

        this.replaceChildren(this.form);
        this.#isInit = true;

    }

    // Public API

    /** Native form element */
    form = document.createElement('form');
    /** Two way object */
    get $() {
        return this.#valueGetterObject;
    }
    getConfig() {
        return this.#config;
    }
    /** Change the entire config and rebuild the form */
    setConfig(config: Config) {
        this.#config = config;
        this.#titleEl.textContent = config.title?.trim() ?? '';
        this.#fields = {};
        this.#valueGetterObject = Object.create(null);
        this.form.replaceChildren();
        this.form.append(this.#titleEl);
        for (const f of config.fields ?? []) {
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
        this.form.append(this.#buttonRow);
        this.#update();
        this.#dispatchUpdateEvent('setConfig');
    }
    /** Get object of active and relevant form field values */
    getValue() {
        const result: Record<string, Value> = {};
        for (const f of Object.values(this.#fields)) {
            if (f.disabled || !f.visible) continue;
            result[f.name] = f.value;
        }
        return result;
    }
    /** Pass in object to set form values and clear missing keys */
    setValue(val: Record<string, Value>) {
        for (const key in this.#fields) {
            // if in, else get empty
            if (key in val) {
                this.#fields[key].value = val[key];
            }
            else {
                this.#fields[key].value = this.#getEmptyValue(this.#fields[key]);
            }
        }
        this.#dispatchUpdateEvent('setValue');
    }
    /** Pass in object to set form values (ignore missing keys) */
    mergeValue(val: Record<string, Value>) {
        for (const key in val) {
            if (key in this.#fields) this.#fields[key].value = val[key];
        }
        this.#dispatchUpdateEvent('mergeValue');
    }
    /**  JSON form value */
    getJson() {
        return JSON.stringify(this.getValue());
    }
    /** Native FormData object */
    getFormData() {
        return new FormData(this.form);
    }
    /** Clear entire form */
    clear() {
        for (const f of Object.values(this.#fields)) {
            f.value = this.#getEmptyValue(f);
        }
        this.#dispatchUpdateEvent('clear');
    }
    /** Reset to default values */
    reset() {
        // Maybe just use the config instead of relying on dom reset.
        this.form.reset();
        this.#update();
        this.#dispatchUpdateEvent('reset');
        return this.#valueGetterObject;
    }
    /** Save a snapshot of the current form state by name */
    saveSnapshot(name: string) {
        const clone = structuredClone(this.#valueGetterObject);
        this.#snapshots[name] = clone;
        return clone;
    }
    /** Load a snapshot of the current form state by name */
    loadSnapshot(name: string) {
        const value = this.#snapshots[name];
        if (!value) return;
        this.setValue(value);
        return structuredClone(value);
    }


}

customElements.define('logic-form', LogicForm);


type Field = Textbox | Textarea | Checkbox | Select | NumericTextbox | Integer | Decimal | CheckboxGroup | RadioGroup | List | DateInput | HiddenInput;

type FieldBase = {
    type: 'textbox' | 'textarea' | 'checkbox' | 'select' | 'numerictextbox' | 'integer' | 'decimal' | 'checkboxgroup' | 'radiogroup' | 'list' | 'date' | 'hidden';
    name: string;
    label: string | RuleWithReturnValue;
    visible?: BooleanExpression | AndRule | OrRule | NotRule | boolean;
    required?: BooleanExpression | AndRule | OrRule | NotRule | boolean;
    disabled?: BooleanExpression | AndRule | OrRule | NotRule | boolean;
}

type Textbox = FieldBase & {
    type: 'textbox';
    defaultValue?: string | RuleWithReturnValue;
    placeholder?: string | RuleWithReturnValue;
    minLength?: number | RuleWithReturnValue;
    maxLength?: number | RuleWithReturnValue;
    readonly?: BooleanExpression | AndRule | OrRule | NotRule | boolean;
}

type Textarea = FieldBase & {
    type: 'textarea';
    defaultValue?: string | RuleWithReturnValue;
    placeholder?: string | RuleWithReturnValue;
    minLength?: number;
    maxLength?: number;
    readonly?: BooleanExpression | AndRule | OrRule | NotRule | boolean;
}

type Checkbox = FieldBase & {
    type: 'checkbox';
    defaultValue?: boolean;
}

type NumericTextbox = FieldBase & {
    type: 'numerictextbox';
    defaultValue?: string | RuleWithReturnValue;
    placeholder?: string | RuleWithReturnValue;
    minLength?: number | RuleWithReturnValue;
    maxLength?: number | RuleWithReturnValue;
    readonly?: BooleanExpression | AndRule | OrRule | NotRule | boolean;
}

type Integer = FieldBase & {
    type: 'integer';
    defaultValue?: number | RuleWithReturnValue;
    placeholder?: string | RuleWithReturnValue;
    min?: number | RuleWithReturnValue;
    max?: number | RuleWithReturnValue;
    readonly?: BooleanExpression | AndRule | OrRule | NotRule | boolean;
}

type Decimal = FieldBase & {
    type: 'decimal';
    defaultValue?: number | RuleWithReturnValue;
    placeholder?: string | RuleWithReturnValue;
    min?: number | RuleWithReturnValue;
    max?: number | RuleWithReturnValue;
    readonly?: BooleanExpression | AndRule | OrRule | NotRule | boolean;
}

type Select = FieldBase & {
    type: 'select';
    options: {
        text: string;
        value: string;
        //disabled?: Rule[] | boolean;
    }[];
    defaultValue?: string | RuleWithReturnValue;
}

type CheckboxGroup = FieldBase & {
    type: 'checkboxgroup';
    options: {
        text: string;
        value: string;
        //disabled?: Rule[] | boolean;
    }[];
    min?: number | RuleWithReturnValue;
    max?: number | RuleWithReturnValue;
    defaultValue?: string[];
}

type RadioGroup = FieldBase & {
    type: 'radiogroup';
    options: {
        text: string;
        value: string;
        //disabled?: Rule[] | boolean;
    }[];
    defaultValue?: string;
}

type List = FieldBase & {
    type: 'list';
    defaultValue?: string[];
    min?: number;
    max?: number;
    readonly?: BooleanExpression | AndRule | OrRule | NotRule | boolean;
}

type DateInput = FieldBase & {
    type: 'date';
    defaultValue?: string;
    min?: string;
    max?: string;
    readonly?: BooleanExpression | AndRule | OrRule | NotRule | boolean;
}

type HiddenInput = {
    type: 'hidden';
    name: string;
    defaultValue?: string | RuleWithReturnValue;
    disabled?: BooleanExpression | AndRule | OrRule | NotRule | boolean;
}

type Operator = '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | '!in';
type Value = boolean | string | number | string[];
type BooleanExpression = [FieldReference | Value, Operator, FieldReference | Value];
type FieldReference = { field: string };
type AndRule = { and: BooleanExpression[] };
type OrRule = { or: BooleanExpression[] };
type NotRule = { not: BooleanExpression | AndRule | OrRule };

// Could easily change if conditions to be an array of {"field": "fieldA"}, "==", "something", return value,
// with an else at the end

type RuleWithReturnValue = {
    if: BooleanExpression | AndRule | OrRule | NotRule,
    then: Value,
    elseif?: {
        if: BooleanExpression | AndRule | OrRule | NotRule,
        then: Value
    }[],
    else: Value
};

type Config = {
    title: string;
    fields: Field[];
}

type FieldInternal = {
    readonly type: FieldBase['type'];
    readonly el: HTMLDivElement;
    readonly name: string;
    readonly visible: boolean;
    readonly required: boolean;
    readonly disabled: boolean;
    readonly readonly: boolean;
    readonly isTouched: boolean;
    value: Value;
    updateState(): void;
};




// Stuff to work on:
// Date input min/max
// Checkbox group min/max is weird with a rule?
// Fix int, decimal, numeric inputs
// Hidden input
// Errors
// Readonly state (mostly done?)
// Live form builder
// Disabled options
// Rule-able min and max
// Radio clear button styling, List button styling
// in and !in rules don't make sense for determining equal length?
// Select optgroups
// Custom errors
// CSS, transitions, etc.
// Sections
// Conditional sections
// Repeatable sections
