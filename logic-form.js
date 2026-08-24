"use strict";
class LogicForm extends HTMLElement {
    #config;
    #fields = {};
    #snapshots = {};
    #metaKeys = new Set(['a', 'c', 'v', 'x']);
    #integerAllowedKeys = new Set([
        'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End',
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
    ]);
    #integers = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']);
    #valueGetterObject;
    #isInit = false;
    #titleEl = document.createElement('p');
    #submitButton = document.createElement('button');
    #clearButton = document.createElement('button');
    #resetButton = document.createElement('button');
    #buttonRow = document.createElement('div');
    constructor(config) {
        super();
        this.#config = config;
    }
    #isNumeric(val) {
        return typeof val === 'number' && !Number.isNaN(val) && isFinite(val);
    }
    ;
    #isInteger(val) {
        return this.#isNumeric(val) && Number.isSafeInteger(val);
    }
    #isDecimal(val) {
        return this.#isNumeric(val) && !Number.isSafeInteger(val);
    }
    #isRuleWithReturnValue(val) {
        return !!val && typeof val === 'object' && 'if' in val && 'then' in val && typeof val.if === 'object';
    }
    #isFlatStringArrayEqual(array1, array2) {
        array1 = [...new Set(array1)].toSorted();
        array2 = [...new Set(array2)].toSorted();
        return array1.length === array2.length && array1.every((item, i) => item === array2[i]);
    }
    #fixMinMax(f) {
        if (!(f.type === 'integer' || f.type === 'decimal' || f.type === 'list' || f.type === 'checkboxgroup'))
            return;
        if (this.#isNumeric(f.min) && this.#isNumeric(f.max)) {
            if (f.min > f.max)
                f.min = f.max;
        }
        if (f.type !== 'decimal' && this.#isNumeric(f.min))
            f.min = Math.floor(f.min);
        if (f.type !== 'decimal' && this.#isNumeric(f.max))
            f.max = Math.floor(f.max);
        if (this.#isNumeric(f.min) && f.min < 0)
            f.min = 0;
        if (this.#isNumeric(f.max) && f.max < 1)
            f.max = 1;
    }
    ;
    #buildField(f) {
        if (f.name in this.#fields)
            throw new Error(`"${f.name}" exists in the config twice. Can't have two fields named the same.`);
        const id = `_${f.type}_${crypto.randomUUID()}`;
        const div = document.createElement('div');
        div.dataset.fieldName = f.name;
        div.dataset.fieldType = f.type;
        const label = document.createElement('label');
        const labelSpan = document.createElement('span');
        const requiredSpan = document.createElement('span');
        label.htmlFor = id;
        const isLabelRule = this.#isRuleWithReturnValue(f.label);
        if (!isLabelRule && typeof f.label === 'string') {
            labelSpan.textContent = f.label.trim();
        }
        requiredSpan.textContent = ' *';
        requiredSpan.ariaHidden = 'true';
        label.replaceChildren(labelSpan, requiredSpan);
        let input;
        let getValue;
        let setValue;
        let setRequired;
        let setDefaultValue;
        let setPlaceholder;
        let eventToListenFor = 'change';
        const whiteSpaceBlocker = () => input.setCustomValidity(!!getValue() ? '' : 'This field is required.');
        this.#fixMinMax(f);
        if (f.type === 'textbox' || f.type === 'textarea' || f.type === 'numerictextbox') {
            eventToListenFor = 'input';
            input = document.createElement(f.type === 'textarea' ? 'textarea' : 'input');
            if (f.type === 'textbox' || f.type === 'numerictextbox')
                input.type = 'text';
            input.id = id;
            input.name = f.name;
            if (f.placeholder) {
                if (this.#isRuleWithReturnValue(f.placeholder)) {
                    setPlaceholder = () => input.placeholder = String(this.#resolveRuleWithReturnValue(f.placeholder));
                }
                else {
                    input.placeholder = f.placeholder;
                }
            }
            if (f.maxLength && this.#isInteger(f.maxLength))
                input.maxLength = f.maxLength;
            if (f.minLength && this.#isInteger(f.minLength))
                input.minLength = f.minLength;
            div.replaceChildren(label, input);
            getValue = () => input.value.trim();
            setDefaultValue = () => {
                if (typeof f.defaultValue === 'string' || typeof f.defaultValue === 'number') {
                    input.defaultValue = String(f.defaultValue);
                }
                else if (this.#isRuleWithReturnValue(f.defaultValue)) {
                    input.defaultValue = String(this.#resolveRuleWithReturnValue(f.defaultValue));
                }
                else {
                    input.defaultValue = '';
                }
            };
            setValue = (val) => {
                input.value = typeof val === 'string' ? val.trim() : '';
            };
            setRequired = (bool) => {
                input.required = !!bool;
                if (!!bool)
                    input.addEventListener('input', whiteSpaceBlocker);
            };
            if (f.type === 'numerictextbox') {
                input.inputMode = 'numeric';
                input.addEventListener('input', (e) => {
                    const data = e.data;
                    if (!data)
                        return;
                });
                input.addEventListener('keydown', (e) => {
                    if (this.#integerAllowedKeys.has(e.key))
                        return;
                    e.preventDefault();
                });
            }
        }
        else if (f.type === 'checkbox') {
            input = document.createElement('input');
            input.id = id;
            input.name = f.name;
            input.type = 'checkbox';
            setDefaultValue = () => {
                input.defaultChecked = !!f.defaultValue;
            };
            const wrapperSpan = document.createElement('span');
            wrapperSpan.replaceChildren(labelSpan, requiredSpan);
            label.replaceChildren(input, wrapperSpan);
            div.replaceChildren(label);
            getValue = () => !!input.checked;
            setValue = (val) => input.checked = !!val;
            setRequired = (bool) => input.required = !!bool;
        }
        else if (f.type === 'integer' || f.type === 'decimal') {
            const maxLength = this.#isInteger(f.max) ? String(f.max).length : 15;
            eventToListenFor = 'input';
            input = document.createElement('input');
            input.id = id;
            input.name = f.name;
            input.type = 'number';
            input.placeholder = f.placeholder ?? '';
            const hasMin = this.#isNumeric(f.min);
            const hasMax = this.#isNumeric(f.max);
            if (this.#isNumeric(f.defaultValue)) {
                input.defaultValue = String(f.defaultValue);
            }
            if (hasMin && hasMax && f.min > f.max) {
                f.max = f.min;
            }
            if (hasMax) {
                input.max = String(Math.floor(f.max));
            }
            if (hasMin) {
                input.min = String(Math.floor(f.min));
            }
            div.replaceChildren(label, input);
            input.addEventListener('keydown', (e) => {
                const isPasteOrSomething = (e.ctrlKey || e.metaKey) && this.#metaKeys.has(e.key.toLowerCase());
                if (isPasteOrSomething) {
                    return;
                }
                if (input.value.length > maxLength && this.#integers.has(e.key)) {
                    e.preventDefault();
                }
                if (!this.#integerAllowedKeys.has(e.key)) {
                    e.preventDefault();
                }
            });
            input.addEventListener('input', () => {
            });
            getValue = () => {
                const val = input.valueAsNumber;
                if (this.#isNumeric(val)) {
                    if (f.type === 'decimal')
                        return val;
                    return Math.floor(val);
                }
                return '';
            };
            setRequired = (bool) => input.required = !!bool;
            setValue = (val) => {
                if (!this.#isNumeric(val)) {
                    input.value = '';
                    return;
                }
                input.valueAsNumber = f.type === 'integer' ? Math.floor(val) : val;
            };
        }
        else if (f.type === 'select') {
            input = document.createElement('select');
            input.id = id;
            input.name = f.name;
            const validValues = new Set(f.options.map(o => o.value));
            for (const option of f.options) {
                if (typeof option.value === 'undefined') {
                    throw new Error(`select ${f.name} has an option with no value`);
                }
                input.add(new Option(option.text, option.value));
            }
            div.replaceChildren(label, input);
            getValue = () => validValues.has(input.value) ? input.value : '';
            setDefaultValue = () => {
                if (typeof f.defaultValue === 'string') {
                    for (const option of input.options) {
                        option.defaultSelected = option.value === f.defaultValue && validValues.has(f.defaultValue);
                    }
                }
                else if (this.#isRuleWithReturnValue(f.defaultValue)) {
                    const resolved = String(this.#resolveRuleWithReturnValue(f.defaultValue));
                    for (const option of input.options) {
                        option.defaultSelected = option.value === resolved && validValues.has(resolved);
                    }
                }
            };
            setValue = (val) => {
                if (!validValues.has(val))
                    return;
                input.value = val;
            };
            setRequired = (bool) => input.required = !!bool;
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
            if (this.#isInteger(f.min) && this.#isInteger(f.max) && f.min > f.max) {
                f.max = f.min;
            }
            const checkboxes = f.options.map(o => {
                const checkbox = document.createElement('input');
                const label = document.createElement('label');
                label.replaceChildren(checkbox, o.text);
                checkbox.type = 'checkbox';
                checkbox.name = f.name;
                checkbox.value = o.value;
                input.append(label);
                return checkbox;
            });
            if (typeof f.min === 'number' || typeof f.max === 'number') {
            }
            const minMax = () => {
                let validityMessage = '';
                const hasMin = this.#isInteger(f.min) || f.required;
                const hasMax = this.#isInteger(f.max);
                if (hasMin && f.min > f.options.length)
                    throw new Error(`${f.name} min is greater than total options`);
                if (hasMin && hasMax && f.min > f.options.length)
                    f.min = f.options.length;
                if (hasMin && hasMax && f.max > f.options.length)
                    f.max = f.options.length;
                if (hasMin && f.required && (f.min < 1 || typeof f.min === 'undefined'))
                    f.min = 1;
                if (hasMin && hasMax && f.min > f.max)
                    f.max = f.min;
                const selectionLength = checkboxes.filter(c => c.checked && validValues.has(c.value)).length;
                const isTooFew = hasMin && selectionLength < Math.floor(f.min);
                const isTooMany = hasMax && selectionLength > Math.floor(f.max);
                if (hasMin && hasMax && (isTooFew || isTooMany) && f.min === f.max) {
                    validityMessage = `Select exactly ${f.min} option(s).`;
                }
                else if (hasMin && hasMax && (isTooFew || isTooMany)) {
                    validityMessage = `Select ${f.min}-${f.max} option(s).`;
                }
                else if (hasMin && (isTooFew || isTooMany)) {
                    validityMessage = `Select at least ${f.min} option(s).`;
                }
                else if (hasMax && (isTooFew || isTooMany)) {
                    validityMessage = `Select up to ${f.max} option(s).`;
                }
                if (checkboxes.length) {
                    checkboxes[0].setCustomValidity(validityMessage);
                }
                if (!f.required && selectionLength === 0)
                    checkboxes[0].setCustomValidity('');
            };
            input.addEventListener('change', minMax);
            setDefaultValue = () => {
                for (const checkbox of checkboxes) {
                    checkbox.defaultChecked = defaultSelectedValues.has(checkbox.value);
                }
            };
            getValue = () => checkboxes.filter(c => c.checked && validValues.has(c.value)).map(c => c.value);
            setValue = (val = []) => {
                const set = new Set(val.filter(v => validValues.has(v)));
                for (const checkbox of checkboxes) {
                    checkbox.checked = set.has(checkbox.value);
                }
            };
            setRequired = (bool) => {
                minMax();
                requiredSpan.style.display = !!bool ? '' : 'none';
            };
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
            setValue = (val) => {
                for (const radio of radios) {
                    radio.checked = val === radio.value && validValues.has(val);
                }
                updateClearButtonVisibility();
            };
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
            const innerDiv = document.createElement('div');
            legend.replaceChildren(labelSpan, requiredSpan);
            input.append(legend, innerDiv);
            div.replaceChildren(input);
            const listItems = new Set();
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
                itemInput.addEventListener('input', () => itemInput.name = object.value ? f.name : '');
                itemInput.value = val.trim();
                itemDiv.replaceChildren(itemInput, deleteButton);
                const object = {
                    itemDiv,
                    deleteButton,
                    get value() {
                        return itemInput.value.trim();
                    },
                    remove: () => {
                        if (this.#isInteger(f.min) && listItems.size <= f.min)
                            return;
                        listItems.delete(object);
                        itemDiv.dispatchEvent(new Event('change', { bubbles: true }));
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
            const addItem = (val) => {
                if (this.#isInteger(f.max) && listItems.size >= f.max)
                    return;
                const item = buildItem(val);
                listItems.add(item);
                innerDiv.append(item.itemDiv);
                item.itemDiv.dispatchEvent(new Event('change', { bubbles: true }));
            };
            const min = this.#isInteger(f.min) ? f.min : 1;
            const max = this.#isInteger(f.max) ? f.max : 20;
            if (min !== max)
                innerDiv.append(addItemButton);
            getValue = () => {
                const val = [...listItems].map(item => item.value?.trim()).filter(Boolean);
                if (this.#isInteger(f.max))
                    return val.slice(0, f.max);
                return val;
            };
            setValue = (val) => {
                val = Array.isArray(val) ? val.filter(str => typeof str === 'string' && !!str.trim()) : [];
                for (const item of listItems)
                    item.remove();
                if (val.length > max)
                    val.length = max;
                for (const str of val) {
                    addItem(str);
                }
                if (listItems.size < min) {
                    const blanksToAdd = min - listItems.size;
                    for (let i = 0; i < blanksToAdd; i++) {
                        addItem('');
                    }
                }
            };
            setRequired = () => {
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
            setValue(Array.isArray(f.defaultValue) ? f.defaultValue : []);
        }
        else if (f.type === 'date') {
            input = document.createElement('input');
            input.type = 'date';
            input.id = id;
            setDefaultValue = () => {
                if (typeof f.defaultValue === 'string') {
                    input.defaultValue = f.defaultValue;
                }
                else if (this.#isRuleWithReturnValue(f.defaultValue)) {
                    input.defaultValue = String(this.#resolveRuleWithReturnValue(f.defaultValue));
                }
                else {
                    input.defaultValue = '';
                }
            };
            input.name = f.name;
            if (f.min)
                input.min = f.min;
            if (f.max)
                input.max = f.max;
            div.replaceChildren(label, input);
            getValue = () => {
                return input.value;
            };
            setValue = (dateString) => {
                input.value = dateString;
            };
            setRequired = (bool) => {
                input.required = !!bool;
                requiredSpan.style.display = !!bool ? '' : 'none';
            };
        }
        else {
            throw new Error(`field "${f.name}" type invalid`);
        }
        input.addEventListener(eventToListenFor, () => {
            this.#update();
            this.#dispatchUpdateEvent(input);
            _isTouched = true;
        });
        let _isTouched = false;
        let _visible = true;
        let _disabled = false;
        let _required = false;
        const cl = this;
        const internals = {
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
                if (_disabled || !_visible)
                    return cl.#getEmptyValue(this);
                return getValue();
            },
            set value(val) {
                setValue(val ?? cl.#getEmptyValue(this));
                cl.#update();
            },
            get visible() {
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
                _visible = cl.#evaluateBooleanProperty(f.visible, true);
                _disabled = cl.#evaluateBooleanProperty(f.disabled, false);
                _required = cl.#evaluateBooleanProperty(f.required, false);
                setDefaultValue?.();
                setPlaceholder?.();
                if (isLabelRule) {
                    labelSpan.textContent = String(cl.#resolveRuleWithReturnValue(f.label)) ?? '';
                }
                if (_visible) {
                    input.disabled = false || _disabled;
                }
                else {
                }
                requiredSpan.style.display = _required ? '' : 'none';
                setRequired(_required);
                input.disabled = _disabled || !_visible;
            },
        };
        this.#fields[f.name] = internals;
        return internals;
    }
    #getEmptyValue(f) {
        if (f.type === 'checkbox')
            return false;
        if (f.type === 'checkboxgroup' || f.type === 'list')
            return [];
        return '';
    }
    #interpolation(str) {
        const a = str.indexOf('{{');
        const b = str.indexOf('}}');
        if (a === -1)
            return;
        if (b === -1)
            return;
        const fieldName = str.slice(a + 2, b);
        return this.#fields[fieldName].value;
    }
    #updatePasses = 0;
    #visibilityMemo = null;
    #update() {
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
            this.#update();
            return;
        }
        console.info(`Updated the form state in ${this.#updatePasses} ${this.#updatePasses > 1 ? 'passes' : 'pass'}.`);
        let latestVisibleItem = null;
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
    #isSnapshotEqual(oldSnapshot, newSnapshot) {
        if (Object.keys(oldSnapshot).length !== Object.keys(newSnapshot).length)
            return false;
        for (const key in oldSnapshot) {
            if (Array.isArray(oldSnapshot[key]) && Array.isArray(newSnapshot[key])) {
                if (!this.#isFlatStringArrayEqual(oldSnapshot[key], newSnapshot[key]))
                    return false;
            }
            else if (oldSnapshot[key] !== newSnapshot[key]) {
                return false;
            }
        }
        return true;
    }
    #resolveRuleWithReturnValue(rule) {
        const thenResult = this.#evaluateBooleanProperty(rule.if, false);
        if (thenResult)
            return rule.then;
        if (Array.isArray(rule.elseif)) {
            for (const elseifRule of rule.elseif) {
                const elseifResult = this.#evaluateBooleanProperty(elseifRule.if, false);
                if (elseifResult)
                    return elseifRule.then;
            }
        }
        return rule.else || '';
    }
    #evaluateBooleanProperty(propertyVal, defaultValue) {
        if (typeof propertyVal === 'boolean')
            return propertyVal;
        if (typeof propertyVal === 'object' && !!propertyVal)
            return this.#evaluateBooleanRule(propertyVal);
        return defaultValue;
    }
    ;
    #evaluateBooleanRule(rule) {
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
        const [string, operator, valueInRule] = rule;
        const fieldValue = this.#fields[string].value;
        if (operator === '==') {
            if (Array.isArray(fieldValue) && Array.isArray(valueInRule))
                return this.#isFlatStringArrayEqual(fieldValue, valueInRule);
            return fieldValue === valueInRule;
        }
        if (operator === '!=') {
            if (Array.isArray(fieldValue) && Array.isArray(valueInRule))
                return !this.#isFlatStringArrayEqual(fieldValue, valueInRule);
            return fieldValue !== valueInRule;
        }
        if (operator === '>') {
            if (Array.isArray(fieldValue) && Array.isArray(valueInRule)) {
                return fieldValue.length > valueInRule.length;
            }
            return fieldValue > valueInRule;
        }
        if (operator === '<') {
            if (Array.isArray(fieldValue) && Array.isArray(valueInRule)) {
                return fieldValue.length < valueInRule.length;
            }
            return fieldValue < valueInRule;
        }
        if (operator === '>=') {
            if (Array.isArray(fieldValue) && Array.isArray(valueInRule)) {
                return fieldValue.length >= valueInRule.length;
            }
            return fieldValue >= valueInRule;
        }
        if (operator === '<=') {
            if (Array.isArray(fieldValue) && Array.isArray(valueInRule)) {
                return fieldValue.length <= valueInRule.length;
            }
            return fieldValue <= valueInRule;
        }
        if (operator === 'in') {
            return (Array.isArray(fieldValue) && fieldValue.includes(valueInRule));
        }
        if (operator === '!in') {
            return (Array.isArray(fieldValue) && !fieldValue.includes(valueInRule));
        }
        return true;
    }
    ;
    #dispatchUpdateEvent(input) {
        if (typeof input === 'string') {
            this.form.dispatchEvent(new CustomEvent('logic-form-update', { bubbles: true, detail: { input } }));
            return;
        }
        input.dispatchEvent(new CustomEvent('logic-form-update', { bubbles: true, detail: { input } }));
    }
    connectedCallback() {
        if (this.#isInit)
            return;
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
        for (const attr of ['action', 'enctype', 'method', 'novalidate', 'target', 'autocomplete']) {
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
    form = document.createElement('form');
    get $() {
        return this.#valueGetterObject;
    }
    getConfig() {
        return this.#config;
    }
    getValue() {
        const result = {};
        for (const f of Object.values(this.#fields)) {
            if (f.disabled || !f.visible)
                continue;
            result[f.name] = f.value;
        }
        return result;
    }
    setValue(val) {
        for (const key in this.#fields) {
            if (key in val) {
                this.#fields[key].value = val[key];
            }
            else {
                this.#fields[key].value = this.#getEmptyValue(this.#fields[key]);
            }
        }
        this.#dispatchUpdateEvent('setValue');
    }
    mergeValue(val) {
        for (const key in val) {
            if (key in this.#fields)
                this.#fields[key].value = val[key];
        }
        this.#dispatchUpdateEvent('mergeValue');
    }
    getJson() {
        return JSON.stringify(this.getValue());
    }
    getFormData() {
        return new FormData(this.form);
    }
    clear() {
        for (const f of Object.values(this.#fields)) {
            f.value = this.#getEmptyValue(f);
        }
        this.#dispatchUpdateEvent('clear');
    }
    reset() {
        this.form.reset();
        this.#update();
        this.#dispatchUpdateEvent('reset');
        return this.#valueGetterObject;
    }
    saveSnapshot(name) {
        const clone = structuredClone(this.#valueGetterObject);
        this.#snapshots[name] = clone;
        return clone;
    }
    loadSnapshot(name) {
        const value = this.#snapshots[name];
        if (!value)
            return;
        this.setValue(value);
        return structuredClone(value);
    }
    setConfig(config) {
        this.#config = config;
        this.#titleEl.textContent = config.title?.trim() ?? '';
        this.#fields = {};
        this.#valueGetterObject = Object.create(null);
        this.form.replaceChildren();
        this.form.append(this.#titleEl);
        for (const f of config.fields ?? []) {
            const fieldInternal = this.#buildField(f);
            Object.defineProperty(this.#valueGetterObject, f.name, {
                get() {
                    return fieldInternal.value;
                },
                set(value) {
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
}
customElements.define('logic-form', LogicForm);
