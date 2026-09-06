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
    #buildSection() {
    }
    #buildField(f) {
        if (f.name in this.#fields)
            throw new Error(`"${f.name}" exists in the config twice. Can't have two fields named the same.`);
        const cl = this;
        if (f.type === 'hidden') {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = f.name;
            const hasDefaultValueRule = 'defaultValue' in f && this.#isRuleWithReturnValue(f.defaultValue);
            let setDefaultValue;
            if (hasDefaultValueRule) {
                setDefaultValue = () => {
                    input.defaultValue = String(this.#resolveRuleWithReturnValue(f.defaultValue));
                };
            }
            else if (typeof f.defaultValue === 'string' || typeof f.defaultValue === 'number') {
                input.defaultValue = String(f.defaultValue);
            }
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
                        _disabled = cl.#evaluateBooleanProperty(f.disabled, false);
                    }
                    input.disabled = _disabled;
                    setDefaultValue?.();
                },
            };
            this.#fields[f.name] = internals;
            return internals;
        }
        const whiteSpaceBlocker = () => input.setCustomValidity(!!getValue() ? '' : 'This field is required.');
        this.#fixMinMax(f);
        let eventToListenFor = 'change';
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
        let input;
        let getValue;
        let setValue;
        let setRequired;
        let setReadonly;
        let setLabel;
        let setDefaultValue;
        let setPlaceholder;
        let setMin;
        let setMax;
        let setMinLength;
        let setMaxLength;
        const hasLabelRule = 'label' in f && this.#isRuleWithReturnValue(f.label);
        const hasDefaultValueRule = 'defaultValue' in f && this.#isRuleWithReturnValue(f.defaultValue);
        const hasPlaceholderRule = 'placeholder' in f && this.#isRuleWithReturnValue(f.placeholder);
        const hasMinRule = 'min' in f && this.#isRuleWithReturnValue(f.min);
        const hasMaxRule = 'max' in f && this.#isRuleWithReturnValue(f.max);
        const hasMinLengthRule = 'minLength' in f && this.#isRuleWithReturnValue(f.minLength);
        const hasMaxLengthRule = 'maxLength' in f && this.#isRuleWithReturnValue(f.maxLength);
        if (hasLabelRule) {
            setLabel = () => {
                labelSpan.textContent = String(this.#resolveRuleWithReturnValue(f.label)) ?? '';
            };
        }
        else if (typeof f.label === 'string') {
            f.label = f.label.trim();
            labelSpan.textContent = f.label;
        }
        if (f.type === 'textbox' || f.type === 'textarea' || f.type === 'numerictextbox') {
            eventToListenFor = 'input';
            input = document.createElement(f.type === 'textarea' ? 'textarea' : 'input');
            if (f.type === 'textbox' || f.type === 'numerictextbox')
                input.type = 'text';
            input.id = id;
            input.name = f.name;
            if (f.maxLength && this.#isInteger(f.maxLength))
                input.maxLength = f.maxLength;
            if (f.minLength && this.#isInteger(f.minLength))
                input.minLength = f.minLength;
            div.replaceChildren(label, input);
            getValue = () => input.value.trim();
            if (hasDefaultValueRule) {
                setDefaultValue = () => {
                    input.defaultValue = String(this.#resolveRuleWithReturnValue(f.defaultValue));
                };
            }
            else if (typeof f.defaultValue === 'string' || typeof f.defaultValue === 'number') {
                input.defaultValue = String(f.defaultValue || '');
            }
            if (hasPlaceholderRule) {
                setPlaceholder = () => {
                    input.placeholder = String(this.#resolveRuleWithReturnValue(f.placeholder));
                };
            }
            else if (typeof f.placeholder === 'string') {
                input.placeholder = f.placeholder;
            }
            if (hasMinLengthRule) {
                setMinLength = () => {
                    input.minLength = Number(this.#resolveRuleWithReturnValue(f.minLength));
                };
            }
            else if (this.#isInteger(f.minLength)) {
                input.minLength = Number(f.minLength);
            }
            if (hasMaxLengthRule) {
                setMaxLength = () => {
                    input.maxLength = Number(this.#resolveRuleWithReturnValue(f.maxLength));
                };
            }
            else if (this.#isInteger(f.maxLength)) {
                input.maxLength = Number(f.maxLength);
            }
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
        }
        else if (f.type === 'integer' || f.type === 'decimal') {
            const maxLength = this.#isInteger(f.max) ? String(f.max).length : 15;
            eventToListenFor = 'input';
            input = document.createElement('input');
            input.id = id;
            input.name = f.name;
            input.type = 'number';
            if (hasDefaultValueRule) {
                setDefaultValue = () => {
                    input.defaultValue = String(this.#resolveRuleWithReturnValue(f.defaultValue));
                };
            }
            else if (typeof f.defaultValue === 'string' || typeof f.defaultValue === 'number' && this.#isNumeric(f.defaultValue)) {
                input.defaultValue = String(f.defaultValue || '');
            }
            if (hasPlaceholderRule) {
                setPlaceholder = () => {
                    input.placeholder = String(this.#resolveRuleWithReturnValue(f.placeholder));
                };
            }
            else if (typeof f.placeholder === 'string') {
                input.placeholder = f.placeholder;
            }
            if (hasMinRule) {
                setMin = () => {
                    const min = this.#resolveRuleWithReturnValue(f.min);
                    input.min = this.#isInteger(min) ? String(min) : '';
                };
            }
            else {
                input.min = this.#isInteger(f.min) ? String(f.min) : '';
            }
            if (hasMaxRule) {
                setMax = () => {
                    const max = this.#resolveRuleWithReturnValue(f.max);
                    input.max = this.#isInteger(max) ? String(max) : '';
                };
            }
            else {
                input.max = this.#isInteger(f.max) ? String(f.max) : '';
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
            setReadonly = (bool) => {
                input.readOnly = !!bool;
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
            let min;
            let max;
            if (this.#isInteger(f.min))
                min = f.min;
            if (this.#isInteger(f.max))
                max = f.max;
            const minMaxValidation = () => {
                let validityMessage = '';
                const hasMin = this.#isInteger(min) || f.required;
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
                minMaxValidation();
                requiredSpan.style.display = !!bool ? '' : 'none';
            };
            if (hasMinRule) {
                setMin = () => {
                    min = Number(this.#resolveRuleWithReturnValue(f.min));
                };
            }
            if (hasMaxRule) {
                setMax = () => {
                    max = Number(this.#resolveRuleWithReturnValue(f.max));
                };
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
                };
            }
            if (hasMaxRule) {
                setMax = () => {
                };
            }
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
            setReadonly = (bool) => {
                input.readOnly = !!bool;
            };
            if (hasMinRule) {
                setMin = () => {
                };
            }
            if (hasMaxRule) {
                setMax = () => {
                };
            }
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
                setLabel?.();
                setDefaultValue?.();
                setPlaceholder?.();
                setMin?.();
                setMax?.();
                setMinLength?.();
                setMaxLength?.();
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
        const [left, operator, right] = rule;
        const leftValue = typeof left === 'object' && 'field' in left ? this.#fields[left.field].value : left;
        const rightValue = typeof right === 'object' && 'field' in right ? this.#fields[right.field].value : right;
        if (operator === '==') {
            if (Array.isArray(leftValue) && Array.isArray(rightValue))
                return this.#isFlatStringArrayEqual(leftValue, rightValue);
            if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
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
            if (Array.isArray(leftValue) && Array.isArray(rightValue))
                return !this.#isFlatStringArrayEqual(leftValue, rightValue);
            if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
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
            return (rightValue.includes(leftValue));
        }
        if (operator === '!in') {
            return !(rightValue.includes(leftValue));
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
