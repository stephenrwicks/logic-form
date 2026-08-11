Work in progress April / August 2026

This is a small form framework built in a native Web Component. It generates a plain HTML form from a JSON configuration. The Web Component `<logic-form>` is just a thin wrapper around a real `<form>` which is rendered in the light DOM (no shadow DOM is used).

Create the form using the new LogicForm(config) constructor, or put the entire config JSON string in the data-config attribute in HTML (on the logic-form element). The latter is especially interesting because it allows the entire form with its logic to be controlled by the backend.

Field values are two-way bound with getters and setters: setting form.value.fieldName will update the DOM. form.value.fieldName reads directly from the DOM so it is always accurate. This get/set pattern also sanitizes some annoying edge cases: fields are always trimmed, empty list options are ignored, etc.

Currently supports these field types:
'textbox' | 'textarea' | 'checkbox' | 'select' | 'numerictextbox' | 'integer' | 'decimal' | 'checkboxgroup' | 'radiogroup' | 'list' | 'date';

The JSON configuration supports complex interdependent field logic: for example make textbox A required if checkbox B is checked, show textbox C if select element D is set to a certain option, etc.

Example rule: fieldC might have this in its config, and would become required only when fieldA is set to option1 and fieldB has a value more than 5
  "required": [
    {
      "and": [
        { "==": [{ "var": "fieldA" }, "option1"] },
        { ">": [{ "var": "fieldB" }, 5] }
      ]
    }
  ]

Currently "required", "disabled", and "visible" are eligible for rules

`logic-form` also supports basic form attributes 'action', 'enctype', 'method', 'novalidate', 'target', 'autocomplete' and automatically passes them down to the internal form. So you end up with just a normal form once everything initializes. I am intentionally leaning on native forms and native form validation for this project.

Basic API right now:

properties
form: The native HTML form element
value: two-way bound value object

methods
getValue(): fresh copy object of all visible enabled field values
getJson(): Json values
getFormData(): FormData object
clear(): clears form
reset(): resets form to default values (from the config)
saveState(name: string): snapshot the current form state and save it internally by name
loadState(name: string): revert the  form state to a previously saved snapshot
setConfig(config): rebuilds the form from a new config.
