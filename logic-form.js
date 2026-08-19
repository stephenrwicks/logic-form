"use strict";
class LogicForm extends HTMLElement {
    #config;
    #fields = {};
    #states = {};
    #metaKeys = new Set(['a', 'c', 'v', 'x']);
    #integerAllowedKeys = new Set([
        'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End',
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
    ]);
    #integers = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']);
    #valueGetterObject;
    #isInit = false;
    form = document.createElement('form');
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
    #isVarRef(val) {
        return !!val && typeof val === 'object' && 'var' in val && typeof val.var === 'string';
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
        labelSpan.textContent = f.label.trim();
        requiredSpan.textContent = ' *';
        requiredSpan.style.color = 'red';
        requiredSpan.ariaHidden = 'true';
        label.replaceChildren(labelSpan, requiredSpan);
        let input;
        let getValue;
        let setValue;
        let setRequired;
        let eventToListenFor = 'change';
        this.#fixMinMax(f);
        if (f.type === 'textbox' || f.type === 'textarea' || f.type === 'numerictextbox') {
            eventToListenFor = 'input';
            input = document.createElement(f.type === 'textarea' ? 'textarea' : 'input');
            if (f.type === 'textbox' || f.type === 'numerictextbox')
                input.type = 'text';
            input.id = id;
            input.name = f.name;
            if (f.value)
                input.defaultValue = f.value ?? '';
            if (f.placeholder)
                input.placeholder = f.placeholder;
            if (f.maxLength && this.#isInteger(f.maxLength))
                input.maxLength = f.maxLength;
            if (f.minLength && this.#isInteger(f.minLength))
                input.minLength = f.minLength;
            div.replaceChildren(label, input);
            getValue = () => input.value.trim();
            setValue = (val) => {
                input.value = typeof val === 'string' ? val.trim() : '';
            };
            const whiteSpaceBlocker = () => input.setCustomValidity(!!getValue() ? '' : 'This field is required.');
            setRequired = (bool) => {
                input.required = !!bool;
                input.removeEventListener('input', whiteSpaceBlocker);
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
            input.defaultChecked = !!f.value;
            const wrapperSpan = document.createElement('span');
            wrapperSpan.replaceChildren(labelSpan, requiredSpan);
            label.replaceChildren(input, wrapperSpan);
            label.style.display = 'flex';
            div.replaceChildren(label);
            div.style.alignContent = 'end';
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
            if (this.#isNumeric(f.value)) {
                input.defaultValue = String(f.value);
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
                if (!option.value?.trim()) {
                    throw new Error(`select ${f.name} has an option with no value`);
                }
                const selected = option.value === f.value && validValues.has(f.value);
                input.add(new Option(option.text, option.value, selected, selected));
            }
            div.replaceChildren(label, input);
            getValue = () => validValues.has(input.value) ? input.value : '';
            setValue = (val) => input.value = validValues.has(val) ? val : '';
            setRequired = (bool) => input.required = !!bool;
        }
        else if (f.type === 'checkboxgroup') {
            const validValues = new Set(f.options.map(o => o.value));
            const defaultSelectedValues = new Set(f.value ?? []);
            input = document.createElement('fieldset');
            input.id = id;
            const legend = document.createElement('legend');
            legend.replaceChildren(f.label.trim(), requiredSpan);
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
            legend.replaceChildren(f.label.trim(), requiredSpan);
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
                radio.defaultChecked = o.value === f.value;
                input.append(label);
                return radio;
            });
            input.append(clearButton);
            getValue = () => radios.find(r => r.checked && validValues.has(r.value))?.value ?? '';
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
            ;
            input = document.createElement('fieldset');
            input.id = id;
            const legend = document.createElement('legend');
            legend.replaceChildren(f.label.trim(), requiredSpan);
            input.append(legend);
            div.replaceChildren(input);
            const listItems = new Set();
            const hiddenInputDiv = document.createElement('div');
            hiddenInputDiv.style.display = 'none';
            const buildItem = (val = '') => {
                const itemDiv = document.createElement('div');
                itemDiv.style.display = 'flex';
                itemDiv.style.margin = '0px .5rem .25rem .5rem';
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
            const addItem = (val) => {
                if (this.#isInteger(f.max) && listItems.size >= f.max)
                    return;
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
                const val = [...listItems].map(item => item.value?.trim()).filter(Boolean);
                if (this.#isInteger(f.max))
                    return val.slice(0, f.max);
                return val;
            };
            setValue = (val) => {
                val = val.filter(Boolean);
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
            getValue = () => {
                return input.value;
            };
            setValue = (isoString) => {
            };
            setRequired = () => {
            };
        }
        else {
            throw new Error(`field "${f.name}" type invalid`);
        }
        input.addEventListener(eventToListenFor, () => {
            this.#update();
            input.dispatchEvent(new CustomEvent('logic-form-update', { bubbles: true, detail: { input } }));
        });
        let _visible = true;
        let _disabled = false;
        let _required = false;
        const cl = this;
        const internals = {
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
                _visible = cl.#evaluateProperty(f.visible, true);
                _disabled = cl.#evaluateProperty(f.disabled, false);
                _required = cl.#evaluateProperty(f.required, false);
                if (_visible) {
                    div.style.display = '';
                    input.disabled = false || _disabled;
                }
                else {
                    div.style.display = 'none';
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
    #updatePasses = 0;
    #update() {
        const oldSnapshot = this.getValue();
        for (const f of Object.values(this.#fields)) {
            f.updateState();
        }
        const newSnapshot = this.getValue();
        const isStable = this.#isSnapshotEqual(oldSnapshot, newSnapshot);
        this.#updatePasses += 1;
        if (isStable || this.#updatePasses >= 10) {
            console.log(`Updated the form state in ${this.#updatePasses} passes.`);
            this.#updatePasses = 0;
            return;
        }
        this.#update();
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
    #evaluateProperty(propertyVal, defaultValue) {
        if (typeof propertyVal === 'boolean')
            return propertyVal;
        if (Array.isArray(propertyVal))
            return propertyVal.every(rule => this.#evaluateRule(rule));
        return defaultValue;
    }
    ;
    #evaluateRule(rule) {
        if ('==' in rule) {
            const [left, right] = rule['=='];
            const side1 = this.#readRuleSide(left);
            const side2 = this.#readRuleSide(right);
            if (Array.isArray(side1) && Array.isArray(side2))
                return this.#isFlatStringArrayEqual(side1, side2);
            return side1 === side2;
        }
        if ('!=' in rule) {
            const [left, right] = rule['!='];
            const side1 = this.#readRuleSide(left);
            const side2 = this.#readRuleSide(right);
            if (Array.isArray(side1) && Array.isArray(side2))
                return this.#isFlatStringArrayEqual(side1, side2) === false;
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
            return this.#evaluateRule(rule.not) === false;
        }
        if ('and' in rule) {
            return rule.and.every((r) => this.#evaluateRule(r));
        }
        if ('or' in rule) {
            return rule.or.some((r) => this.#evaluateRule(r));
        }
        return true;
    }
    ;
    #readRuleSide(side) {
        if (this.#isVarRef(side)) {
            return this.#fields[side.var].value;
        }
        return side;
    }
    #titleEl = document.createElement('p');
    #submitButton = document.createElement('button');
    #clearButton = document.createElement('button');
    #resetButton = document.createElement('button');
    #buttonRow = document.createElement('div');
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
        this.form.dispatchEvent(new CustomEvent('logic-form-update', { bubbles: true, detail: { input: 'setValue' } }));
    }
    mergeValue(val) {
        for (const key in val) {
            this.#fields[key].value = val[key];
        }
        this.form.dispatchEvent(new CustomEvent('logic-form-update', { bubbles: true, detail: { input: 'mergeValue' } }));
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
        this.form.dispatchEvent(new CustomEvent('logic-form-update', { bubbles: true, detail: { input: 'clear' } }));
        return this.#valueGetterObject;
    }
    reset() {
        this.form.reset();
        for (const fieldInternal of Object.values(this.#fields)) {
            fieldInternal.updateState();
        }
        this.form.dispatchEvent(new CustomEvent('logic-form-update', { bubbles: true, detail: { input: 'reset' } }));
        return this.#valueGetterObject;
    }
    saveState(name) {
        const clone = structuredClone(this.#valueGetterObject);
        this.#states[name] = clone;
        return clone;
    }
    loadState(name) {
        const value = this.#states[name];
        if (!value)
            return;
        this.setValue(value);
        return structuredClone(value);
    }
    setConfig(config) {
        this.#config = config;
        this.form.replaceChildren();
        this.form.append(this.#titleEl);
        this.#titleEl.textContent = config.title?.trim() ?? '';
        this.#fields = {};
        this.#valueGetterObject = Object.create(null);
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
        for (const fieldInternal of Object.values(this.#fields)) {
            fieldInternal.updateState();
        }
        this.form.dispatchEvent(new CustomEvent('logic-form-update', { bubbles: true, detail: { input: 'setConfig' } }));
        this.form.append(this.#buttonRow);
    }
}
customElements.define('logic-form', LogicForm);
