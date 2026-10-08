# logic-form

**Work in progress — 2026**

No AI for this project except to generate demos.

https://stephenrwicks.github.io/logic-form/

This is a small form framework for vanilla HTML/JS, built in a native Web Component. It generates a plain HTML form from a JSON configuration.

This originally started as something built on top of React Hook Form but I thought it would be more interesting to build my own system for vanilla HTML. I'm intentionally leaning on native forms and native form validation. The `<logic-form>` component is a thin wrapper around a real `<form>`, rendered in the light DOM (no shadow DOM). This project has no dependencies.

## Basic example

Create a form with `<logic-form data-config="...">`.

```html
<logic-form data-config='{
  "title": "Contact",
  "fields": [
    {
      "type": "textbox",
      "name": "name",
      "label": "Name",
      "required": true,
      "placeholder": "Your name"
    },
    {
      "type": "checkbox",
      "name": "subscribe",
      "label": "Subscribe to updates"
    }
  ]
}'>
</logic-form>
```

This creates a required text field and a checkbox, using ordinary HTML form controls.

You can also create the form in JS, although this doesn't totally take advantage of the backend-first declarative nature of this project.
```js
const form = new LogicForm(config); 
```

## Field types

Currently supported field types:

* `textbox`
* `textarea`
* `checkbox`
* `select`
* `numerictextbox`
* `integer`
* `decimal`
* `checkboxgroup`
* `radiogroup`
* `list`
* `date`
* `hidden`

## Dynamic properties

Each field type has typical properties like label, required, visible, disabled, min, max, etc. Field properties can use literal values, references to other field values, references to the length of other field values, boolean expressions, or conditional values. Everything gets updated in real time.

### Literal values

Properties can use ordinary strings, numbers, and booleans.

```json
{
  "type": "textbox",
  "name": "email",
  "label": "Email address",
  "required": true,
  "defaultValue": "user@example.com"
}
```

### Field references

A field reference resolves to the current value of another field. A field reference is an object shaped {field: "name"}. This placeholder for example would update in real time to the value of the field with the name/key "A."

```json
"placeholder": {"field": "A"}
```

### Boolean expressions

Boolean expressions compare values and can control boolean properties such as `required`, `disabled`, and `visible`.

For example, show the company field only when `accountType` equals `"business"`:

```json
"visible": [{"field": "accountType"},"==","business"]
```

You can also compare fields. Each comparison is an array with three items with an operator in the middle.
```json
"disabled": [{"field": "fieldA"}, "<", {"field": "fieldB"}]
```

Supported comparison operators:

`==` | `!=` | `>` | `<` | `>=` | `<=` | `in` | `!in`

Use `and`, `or`, and `not` to combine conditions.

For example, `fieldC` becomes required only when `fieldA` is set to `"option1"` and `fieldB` is greater than `5`:

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

### Length references

A length reference resolves to the length of another field's value. 

```json
"min": {"length": "features"}
```

You can use length references in comparisons too:

```json
[{"length": "fieldA"}, ">", 5]
```


### Conditional properties

You can also do if/elseif/else conditions to return values in different scenarios. Conditions are evaluated in order. The first matching condition returns its `then` value.

Change a placeholder based on the selected room size:

```json
"placeholder": {
  "when": [
    {
      "if": [{"field": "room"}, "==", "small"],
      "then": "Select 1-5"
    },
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

Change `min` and `max` based on the selected room size:

```json
"min": {
  "when": [
    {
      "if": [{"field": "room"}, "==", "small"],
      "then": 1
    },
    {
      "if": [{"field": "room"}, "==", "medium"],
      "then": 5
    }
  ],
  "else": 10
},
"max": {
  "when": [
    {
      "if": [{"field": "room"}, "==", "small"],
      "then": 5
    },
    {
      "if": [{"field": "room"}, "==", "medium"],
      "then": 15
    }
  ],
  "else": 30
}
```

Change a label dynamically:

```json
"label": {
  "when": [
    {
      "if": [{"field": "accountType"}, "==", "business"],
      "then": "Business name"
    }
  ],
  "else": "Name"
}
```

Rules are supported on the following properties:

`visible`, `required`, `disabled`, `readonly`, `label`, `placeholder`, `defaultValue`, `min`, `max`, `minLength`, `maxLength`

## API

### Properties

    form: The native HTML <form> element.
    $: Special two-way bound value object.

### Methods

    getConfig(config): Get config.
    setConfig(config): Rebuilds the form using a new configuration.
    setValue(): Pass in an object. Sets value of all form fields. Clears keys that aren't present
    mergeValue(): Pass in an object. Sets value of keys passed in.
    getValue(): Returns a fresh copy of all visible, enabled field values.
    getJson(): Returns the current values as JSON.
    getFormData(): Returns a native FormData object.
    clear(): Clears all form fields.
    reset(): Resets the form to its default values from the configuration.
    saveSnapshot(name: string): Saves a snapshot of the current form state internally under the specified name.
    loadSnapshot(name: string): Restores the form state from a previously saved snapshot.


## Two-way-bound values with `$`

Field values are two-way bound with getters and setters in the special "$" object: setting form.$.fieldName will update the DOM. Accessing form.$.fieldName reads directly from the DOM so it is always accurate. This get/set pattern also sanitizes some annoying edge cases: fields are always trimmed, empty list options are ignored, etc.

```js
  const form = document.querySelector('logic-form');

  // Read the current value.
  console.log(form.$.name);

  // Set the value AND update the DOM
  form.$.name = 'Stephen';

```

Values accessed through `$` stay synchronized with the form. Setting a value through `$` updates the field and triggers the form's normal update process, allowing dependent rules and properties to respond.
