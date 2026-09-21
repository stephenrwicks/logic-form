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
    #fieldWrapper = document.createElement('div');
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
        return !!val && typeof val === 'object' && 'when' in val && Array.isArray(val.when) && 'else' in val;
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
    #buildSection() {
    }
    #buildField(f) {
        if (f.name in this.#fields)
            throw new Error(`"${f.name}" exists in the config twice. Can't have two fields named the same.`);
        const cl = this;
        if (f.type === 'hidden') {
            let _defaultString = '';
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = f.name;
            let _disabled = false;
            const internals = {
                get isTouched() {
                    return false;
                },
                get type() {
                    return 'hidden';
                },
                get name() {
                    return f.name;
                },
                get value() {
                    if (_disabled)
                        return '';
                    return input.value;
                },
                set value(val) {
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
                        const oldDisabled = _disabled;
                        _disabled = cl.#evaluateBooleanProperty(f.disabled, false);
                        if (_disabled !== oldDisabled)
                            input.disabled = _disabled;
                    }
                    if ('defaultValue' in f) {
                        const oldDefaultString = _defaultString;
                        _defaultString = String(cl.#evaluateStringProperty(f.defaultValue));
                        if (_defaultString !== oldDefaultString)
                            input.defaultValue = _defaultString;
                    }
                },
            };
            this.#fields[f.name] = internals;
            return internals;
        }
        const whiteSpaceBlocker = () => input.setCustomValidity(!!getValue() ? '' : 'This field is required.');
        let eventToListenFor = 'change';
        const id = `_${f.type}_${crypto.randomUUID()}`;
        const div = document.createElement('div');
        div.className = 'logic-form-field';
        div.dataset.fieldName = f.name;
        div.dataset.fieldType = f.type;
        const label = document.createElement('label');
        const labelSpan = document.createElement('span');
        const requiredSpan = document.createElement('span');
        label.htmlFor = id;
        requiredSpan.textContent = ' *';
        requiredSpan.ariaHidden = 'true';
        requiredSpan.style.color = 'var(--danger)';
        label.replaceChildren(labelSpan, requiredSpan);
        let input;
        let getValue;
        let setValue;
        let setRequired;
        let setReadonly;
        let setLabel;
        let setDefaultBool;
        let setDefaultString;
        let setDefaultNumber;
        let setDefaultArray;
        let setPlaceholder;
        let setMin;
        let setMax;
        let setMinDate;
        let setMaxDate;
        let setMinLength;
        let setMaxLength;
        let setError;
        if (f.type === 'textbox' || f.type === 'textarea' || f.type === 'numerictextbox') {
            eventToListenFor = 'input';
            input = document.createElement(f.type === 'textarea' ? 'textarea' : 'input');
            if (f.type === 'textbox' || f.type === 'numerictextbox')
                input.type = 'text';
            input.id = id;
            input.name = f.name;
            div.replaceChildren(label, input);
            getValue = () => input.value.trim();
            setValue = (val) => {
                input.value = typeof val === 'string' ? val.trim() : '';
            };
            setRequired = (bool) => {
                input.required = !!bool;
                if (!!bool)
                    input.addEventListener('input', whiteSpaceBlocker);
            };
            setReadonly = (bool) => {
                input.readOnly = !!bool;
            };
            setPlaceholder = (p = '') => {
                input.placeholder = p.trim();
            };
            setDefaultString = (v) => {
                input.defaultValue = String(v).trim();
            };
            setMinLength = (min) => {
                input.minLength = this.#isInteger(min) ? min : -1;
            };
            setMaxLength = (max) => {
                input.maxLength = this.#isInteger(max) ? max : -1;
            };
            setError = (e = '') => input.setCustomValidity(e);
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
            input.defaultChecked = !!f.defaultValue;
            const wrapperSpan = document.createElement('span');
            wrapperSpan.replaceChildren(labelSpan, requiredSpan);
            label.replaceChildren(input, wrapperSpan);
            div.replaceChildren(label);
            getValue = () => !!input.checked;
            setValue = (val) => input.checked = !!val;
            setRequired = (bool) => input.required = !!bool;
            setError = (e = '') => input.setCustomValidity(e);
            setDefaultBool = (v) => input.defaultChecked = !!v;
        }
        else if (f.type === 'integer' || f.type === 'decimal') {
            eventToListenFor = 'input';
            input = document.createElement('input');
            input.id = id;
            input.name = f.name;
            input.type = 'number';
            div.replaceChildren(label, input);
            getValue = () => {
                const val = input.valueAsNumber;
                if (!this.#isNumeric(val))
                    return 0;
                if (f.type === 'decimal')
                    return val;
                return Math.floor(val);
            };
            setValue = (val) => {
                if (!this.#isNumeric(val)) {
                    input.value = '';
                    return;
                }
                input.valueAsNumber = f.type === 'integer' ? Math.floor(val) : val;
            };
            setRequired = (bool) => input.required = !!bool;
            setReadonly = (bool) => {
                input.readOnly = !!bool;
            };
            setPlaceholder = (p = '') => {
                input.placeholder = p.trim();
            };
            setDefaultString = (v) => {
                input.defaultValue = (this.#isNumeric(Number(v))) ? String(v).trim() : '';
            };
            setMin = (min) => {
                input.min = this.#isInteger(min) ? String(min) : '';
            };
            setMax = (max) => {
                input.max = this.#isInteger(max) ? String(max) : '';
            };
            setError = (e = '') => input.setCustomValidity(e);
            input.addEventListener('keydown', (e) => {
            });
            input.addEventListener('input', () => {
            });
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
            setValue = (val) => {
                if (!validValues.size)
                    return;
                if (val === '' && !validValues.has('')) {
                    input.value = [...validValues.values()][0];
                }
                if (!validValues.has(val))
                    return;
                input.value = val;
            };
            setRequired = (bool) => input.required = !!bool;
            setError = (e = '') => input.setCustomValidity(e);
            setDefaultString = (v) => {
                if (!validValues.has(v)) {
                    [...input.options][0].defaultSelected = true;
                    return;
                }
                for (const option of input.options) {
                    option.defaultSelected = option.value === v && validValues.has(v);
                }
            };
        }
        else if (f.type === 'checkboxgroup') {
            const validValues = new Set(f.options.map(o => o.value));
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
            const minMaxValidation = () => {
                let min = Number(input.dataset.min ?? 0);
                let max = Number(input.dataset.max ?? f.options.length);
                let validityMessage = '';
                const hasMin = this.#isInteger(min);
                const hasMax = this.#isInteger(max);
                if (hasMin && min > f.options.length)
                    throw new Error(`${f.name} min is greater than total options`);
                if (hasMin && hasMax && min > f.options.length)
                    min = f.options.length;
                if (hasMin && hasMax && max > f.options.length)
                    max = f.options.length;
                if (hasMin && f.required && (min < 1 || typeof min === 'undefined'))
                    min = 1;
                if (hasMin && hasMax && min > max)
                    f.max = min;
                const selectionLength = checkboxes.filter(c => c.checked && validValues.has(c.value)).length;
                const isTooFew = hasMin && selectionLength < Math.floor(min);
                const isTooMany = hasMax && selectionLength > Math.floor(max);
                if (hasMin && hasMax && (isTooFew || isTooMany) && min === max) {
                    validityMessage = `Select exactly ${min} option(s).`;
                }
                else if (hasMin && hasMax && (isTooFew || isTooMany)) {
                    validityMessage = `Select ${min}-${max} option(s).`;
                }
                else if (hasMin && (isTooFew || isTooMany)) {
                    validityMessage = `Select at least ${min} option(s).`;
                }
                else if (hasMax && (isTooFew || isTooMany)) {
                    validityMessage = `Select up to ${max} option(s).`;
                }
                if (checkboxes.length) {
                    checkboxes[0].setCustomValidity(validityMessage);
                }
                if (!f.required && selectionLength === 0)
                    checkboxes[0].setCustomValidity('');
            };
            input.addEventListener('change', minMaxValidation);
            getValue = () => checkboxes.filter(c => c.checked && validValues.has(c.value)).map(c => c.value);
            setValue = (val = []) => {
                const set = new Set(val.filter(v => validValues.has(v)));
                for (const checkbox of checkboxes) {
                    checkbox.checked = set.has(checkbox.value);
                }
            };
            setRequired = (bool) => {
                input.dataset.min = !!bool ? '1' : '0';
                input.dataset.required = String(!!bool);
                requiredSpan.style.display = !!bool ? '' : 'none';
                minMaxValidation();
            };
            setMin = (min) => {
                input.dataset.min = String(min);
                minMaxValidation();
            };
            setMax = (max) => {
                input.dataset.max = String(max);
                minMaxValidation();
            };
            setError = (e = '') => {
                if (checkboxes.length)
                    checkboxes[0].setCustomValidity(e);
            };
            setDefaultArray = (v = []) => {
                const defaultSelectedValues = new Set(v);
                for (const checkbox of checkboxes) {
                    checkbox.defaultChecked = defaultSelectedValues.has(checkbox.value);
                }
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
            const updateClearButtonVisibility = () => clearButton.style.display = radios.some(r => r.checked) ? '' : 'none';
            input.addEventListener('change', () => updateClearButtonVisibility());
            clearButton.addEventListener('click', () => internals.value = '');
            const radios = f.options.map(o => {
                const radio = document.createElement('input');
                const label = document.createElement('label');
                const radioId = `_${crypto.randomUUID()}`;
                label.replaceChildren(radio, o.text);
                label.htmlFor = radioId;
                radio.type = 'radio';
                radio.id = radioId;
                radio.name = f.name;
                radio.value = o.value;
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
                input.dataset.required = String(!!bool);
                requiredSpan.style.display = !!bool ? '' : 'none';
            };
            setDefaultString = (v) => {
                for (const option of radios) {
                    option.defaultChecked = option.value === v && validValues.has(v);
                }
                updateClearButtonVisibility();
            };
            setError = (e = '') => {
                if (radios.length)
                    radios[0].setCustomValidity(e);
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
                    itemInput,
                    deleteButton,
                    get value() {
                        return itemInput.value.trim();
                    },
                    remove: () => {
                        if (this.#isInteger(f.min) && listItems.size <= f.min)
                            return;
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
            const addItem = (val) => {
                if (this.#isInteger(f.max) && listItems.size >= f.max)
                    return;
                const item = buildItem(val);
                listItems.add(item);
                innerDiv.append(item.itemDiv);
                item.itemDiv.dispatchEvent(new Event('change', { bubbles: true }));
            };
            let min = 1;
            let max = 20;
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
            setRequired = (bool) => {
                input.dataset.required = String(!!bool);
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
            setDefaultArray = (v = []) => {
            };
            setMin = (min) => {
                input.dataset.min = String(min);
            };
            setMax = (max) => {
                input.dataset.max = String(max);
            };
            setError = (e = '') => {
                if (listItems.size)
                    [...listItems.values()][0].itemInput.setCustomValidity(e);
            };
        }
        else if (f.type === 'date') {
            input = document.createElement('input');
            input.type = 'date';
            input.id = id;
            input.name = f.name;
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
            setReadonly = (bool) => {
                input.readOnly = !!bool;
            };
            setDefaultString = (v) => {
                input.defaultValue = v;
            };
            setMinDate = (min) => {
            };
            setMaxDate = (max) => {
            };
            setError = (e = '') => {
                input.setCustomValidity(e);
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
        let _readonly = false;
        let _defaultString = '';
        let _defaultBool = false;
        let _defaultNumber = 0;
        let _defaultArray = [];
        let _label = '';
        let _placeholder = '';
        let _min = 0;
        let _max = 0;
        let _minLength = 0;
        let _maxLength = 0;
        let _error = '';
        requiredSpan.style.display = 'none';
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
                    const oldDisabled = _disabled;
                    _disabled = cl.#evaluateBooleanProperty(f.disabled, false);
                    if (_disabled !== oldDisabled)
                        input.disabled = _disabled;
                }
                if (setRequired && 'required' in f) {
                    const oldRequired = _required;
                    _required = cl.#evaluateBooleanProperty(f.required, false);
                    if (_required !== oldRequired) {
                        setRequired(_required);
                        requiredSpan.style.display = _required ? '' : 'none';
                    }
                }
                if (setReadonly && 'readonly' in f) {
                    const oldReadonly = _readonly;
                    _readonly = cl.#evaluateBooleanProperty(f.readonly, false);
                    if (_readonly !== oldReadonly)
                        setReadonly(_readonly);
                }
                if ('label' in f) {
                    const oldLabel = _label;
                    _label = cl.#evaluateStringProperty(f.label);
                    if (_label !== oldLabel)
                        labelSpan.textContent = _label.trim();
                }
                if (setPlaceholder && 'placeholder' in f) {
                    const oldPlaceholder = _placeholder;
                    _placeholder = cl.#evaluateStringProperty(f.placeholder);
                    if (_placeholder !== oldPlaceholder)
                        setPlaceholder(_placeholder);
                }
                if (setMin && 'min' in f) {
                    const oldMin = _min;
                    _min = cl.#evaluateNumberProperty(f.min);
                    if (_min !== oldMin)
                        setMin(_min);
                }
                if (setMax && 'max' in f) {
                    const oldMax = _max;
                    _max = cl.#evaluateNumberProperty(f.max);
                    if (_max !== oldMax)
                        setMax(_max);
                }
                if (setMinLength && 'minLength' in f) {
                    const oldMinLength = _minLength;
                    _minLength = cl.#evaluateNumberProperty(f.minLength);
                    if (_minLength !== oldMinLength)
                        setMinLength(_minLength);
                }
                if (setMaxLength && 'maxLength' in f) {
                    const oldMaxLength = _maxLength;
                    _maxLength = cl.#evaluateNumberProperty(f.maxLength);
                    if (_maxLength !== oldMaxLength)
                        setMaxLength(_maxLength);
                }
                if (setError && 'error' in f) {
                    const oldError = _error;
                    _error = cl.#evaluateStringProperty(f.error);
                    if (_error !== oldError)
                        setError(_error);
                }
                if (setDefaultString && 'defaultValue' in f) {
                    const oldDefaultString = _defaultString;
                    _defaultString = cl.#evaluateStringProperty(f.defaultValue);
                    if (_defaultString !== oldDefaultString)
                        setDefaultString(_defaultString);
                }
                if (setDefaultBool && 'defaultValue' in f) {
                    const oldDefaultBool = _defaultBool;
                    _defaultBool = cl.#evaluateBooleanProperty(f.defaultValue, false);
                    if (_defaultBool !== oldDefaultBool)
                        setDefaultBool(_defaultBool);
                }
                if (setDefaultArray && 'defaultValue' in f) {
                    const oldDefaultArray = _defaultArray;
                    if (!cl.#isFlatStringArrayEqual(_defaultArray, oldDefaultArray))
                        setDefaultArray(_defaultArray);
                }
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
                    latestVisibleItem ? latestVisibleItem.after(f.el) : this.#fieldWrapper.append(f.el);
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
        return rule.when.find(condition => this.#evaluateBooleanProperty(condition.if, false))?.then ?? rule.else ?? '';
    }
    #evaluateStringProperty(propertyVal) {
        if (propertyVal === null || typeof propertyVal === 'undefined')
            return '';
        if (typeof propertyVal === 'string')
            return propertyVal.trim();
        if (typeof propertyVal === 'number')
            return String(propertyVal).trim();
        if (this.#isRuleWithReturnValue(propertyVal))
            return String(this.#resolveRuleWithReturnValue(propertyVal)).trim();
        return '';
    }
    #evaluateNumberProperty(propertyVal) {
        if (propertyVal === null || typeof propertyVal === 'undefined')
            return 0;
        let val = 0;
        if (typeof propertyVal === 'string')
            val = Number(propertyVal);
        else if (typeof propertyVal === 'number')
            val = propertyVal;
        else if (this.#isRuleWithReturnValue(propertyVal))
            val = Number(this.#resolveRuleWithReturnValue(propertyVal));
        return this.#isNumeric(val) ? val : 0;
    }
    #evaluateArrayProperty(propertyVal) {
        if (propertyVal === null || typeof propertyVal === 'undefined')
            return [];
        if (Array.isArray(propertyVal))
            return propertyVal;
        if (this.#isRuleWithReturnValue(propertyVal)) {
            const val = this.#resolveRuleWithReturnValue(propertyVal);
            if (Array.isArray(val))
                return val;
        }
        return [];
    }
    #evaluateBooleanProperty(propertyVal, defaultValue) {
        if (typeof propertyVal === 'boolean')
            return propertyVal;
        if (typeof propertyVal === 'object' && !!propertyVal)
            return this.#evaluateBooleanExpression(propertyVal);
        return defaultValue;
    }
    ;
    #evaluateBooleanExpression(rule) {
        if (typeof rule === 'undefined')
            return false;
        if (typeof rule === 'boolean')
            return rule;
        const isArray = Array.isArray(rule);
        if (!isArray && 'and' in rule) {
            return rule.and.every((r) => this.#evaluateBooleanExpression(r));
        }
        if (!isArray && 'or' in rule) {
            return rule.or.some((r) => this.#evaluateBooleanExpression(r));
        }
        if (!isArray && 'not' in rule) {
            return !this.#evaluateBooleanExpression(rule.not);
        }
        let [left, operator, right] = rule;
        if (typeof left === 'object' && !Array.isArray(left) && 'field' in left) {
            left = this.#fields[left.field].value;
        }
        else if (typeof left === 'object' && !Array.isArray(left) && 'length' in left) {
            left = this.#fields[left.length].value;
            left = Array.isArray(left) || typeof left === 'string' ? left.length : 0;
        }
        if (typeof right === 'object' && !Array.isArray(right) && 'field' in right) {
            right = this.#fields[right.field].value;
        }
        else if (typeof right === 'object' && !Array.isArray(right) && 'length' in right) {
            right = this.#fields[right.length].value;
            right = Array.isArray(right) || typeof right === 'string' ? right.length : 0;
        }
        if (operator === '==') {
            if (Array.isArray(left) && Array.isArray(right))
                return this.#isFlatStringArrayEqual(left, right);
            return left == right;
        }
        if (operator === '!=') {
            if (Array.isArray(left) && Array.isArray(right))
                return !this.#isFlatStringArrayEqual(left, right);
            return left != right;
        }
        if (operator === '>') {
            return left > right;
        }
        if (operator === '<') {
            return left < right;
        }
        if (operator === '>=') {
            return left >= right;
        }
        if (operator === '<=') {
            return left <= right;
        }
        if (operator === 'in') {
            return right.includes(left);
        }
        if (operator === '!in') {
            return !right.includes(left);
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
    #dispatchSubmitEvent() {
        this.form.dispatchEvent(new CustomEvent('logic-form-submit', { bubbles: true, detail: { value: this.getValue() } }));
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
        for (const attr of ['onsubmit', 'action', 'enctype', 'method', 'novalidate', 'target', 'autocomplete']) {
            if (this.hasAttribute(attr)) {
                const val = this.getAttribute(attr) ?? '';
                this.removeAttribute(attr);
                this.form.setAttribute(attr, val);
            }
        }
        this.form.className = 'logic-form-form';
        this.#fieldWrapper.className = 'logic-form-main';
        this.#titleEl.className = 'logic-form-title';
        this.#submitButton.type = 'submit';
        this.#submitButton.textContent = 'Submit';
        this.#clearButton.type = 'button';
        this.#clearButton.textContent = 'Clear';
        this.#clearButton.addEventListener('click', () => this.clear());
        this.#resetButton.type = 'button';
        this.#resetButton.textContent = 'Reset';
        this.#resetButton.addEventListener('click', () => this.reset());
        this.#buttonRow.className = 'logic-form-button-row';
        this.#buttonRow.replaceChildren(this.#resetButton, this.#clearButton, this.#submitButton);
        this.form.replaceChildren(this.#titleEl, this.#fieldWrapper, this.#buttonRow);
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
    setConfig(config) {
        this.#config = config;
        this.#titleEl.textContent = config.title?.trim() ?? '';
        this.#fields = {};
        this.#valueGetterObject = Object.create(null);
        this.form.onsubmit = (e) => e.preventDefault();
        this.#fieldWrapper.replaceChildren();
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
            this.#fieldWrapper.append(fieldInternal.el);
        }
        this.#update();
        this.#dispatchUpdateEvent('setConfig');
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
}
customElements.define('logic-form', LogicForm);
