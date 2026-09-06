# logic-form

**Work in progress — March / April / August / September 2026**

No AI for this project except to generate demos.

https://stephenrwicks.github.io/logic-form/

This is a small form framework intended for vanilla HTML/JS built in a native Web Component.  I am intentionally leaning on native forms and native form validation for this project. It generates a plain HTML form from a JSON configuration. The Web Component `<logic-form>` is just a thin wrapper around a real `<form>` which is rendered in the light DOM (no shadow DOM is used).

Create a form simply with `<logic-form data-config="...">` where the data-config attribute is the entire form schema. This is powerful because it allows the backend to declare a lot of frontend logic without injecting scripts. (You can also use new LogicForm(config) on the frontend).

The JSON configuration supports complex interdependent field logic: for example make textbox A required if checkbox B is checked, show textbox C only if select element D is set to a certain option, etc. 

Currently supports these field types:

- `'textbox'`
- `'textarea'`
- `'checkbox'`
- `'select'`
- `'numerictextbox'`
- `'integer'`
- `'decimal'`
- `'checkboxgroup'`
- `'radiogroup'`
- `'list'`
- `'date'`
- `'hidden'`



Example rule: fieldC might have this in its config, and would become required only when fieldA is set to option1 and fieldB has a value more than 5:

```json
"required": [
  {
    "and": [
      [{"field": "fieldA"}, "==", "option1"],
      [{"field": "fieldB"}, ">", 5]
    ]
  }
]
```

Supports these operators: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | '!in'

Supports rules on the following properties: visible, required, disabled, readonly, label, placeholder, defaultValue, min, max, minLength, maxLength

Some rules require a return value, which looks like this:

```json
"placeholder": {
  "if": [{"field": "room"}, "==", "small"],
  "then": "Select 1-5",
  "elseif": [
    {
      "if": [{"field": "room"}, "==", "medium"],
      "then": "Select 5-15"
    },
    {
      "if": [{"field": "room"}, "==", "large"],
      "then": "Select 10-30"
    }
  ],
  "else": "Select a room"
}
```

You can also compare field values like
```json
[{"field": "A"}, "==", {"field": "B"}]
```


`logic-form` supports basic form attributes `'action'`, `'enctype'`, `'method'`, `'novalidate'`, `'target'`, `'autocomplete'` and automatically passes them down to the internal form. So you end up with just a normal form once everything initializes.


Field values are two-way bound with getters and setters in the special "$" object: setting `form.$.fieldName` will update the DOM. Accessing `form.$.fieldName` reads directly from the DOM so it is always accurate. This get/set pattern also sanitizes some annoying edge cases: fields are always trimmed, empty list options are ignored, etc.


## Basic API right now

### Properties

* `form`: The native HTML `<form>` element.
* `$`: Special two-way bound value object.

### Methods

* `getConfig(config)`: Get config.
* `setConfig(config)`: Rebuilds the form using a new configuration.
* `setValue()`: Pass in an object. Sets value of all form fields. Clears keys that aren't present
* `mergeValue()`: Pass in an object. Sets value of keys passed in.
* `getValue()`: Returns a fresh copy of all visible, enabled field values.
* `getJson()`: Returns the current values as JSON.
* `getFormData()`: Returns a native `FormData` object.
* `clear()`: Clears all form fields.
* `reset()`: Resets the form to its default values from the configuration.
* `saveSnapshot(name: string)`: Saves a snapshot of the current form state internally under the specified name.
* `loadSnapshot(name: string)`: Restores the form state from a previously saved snapshot.

