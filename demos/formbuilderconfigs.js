"use strict";
const baseFields = [
    {
        type: "select",
        name: "type",
        label: "Field Type",
        options: [{ text: "Textbox", value: "textbox" }],
    },
    {
        type: "textbox",
        name: "name",
        label: "Name",
        required: true,
        minLength: 1,
        maxLength: 50,
        value: "field1"
    },
    {
        type: "textbox",
        name: "label",
        label: "Label",
        required: true,
        minLength: 1,
        maxLength: 50,
        value: "New Textbox"
    },
    {
        type: "checkbox",
        name: "required",
        label: "Required"
    },
    {
        type: "checkbox",
        name: "visible",
        label: "Visible",
        value: true,
    },
    {
        type: "checkbox",
        name: "disabled",
        label: "Disabled"
    }
];
const textboxFields = [
    {
        type: "textbox",
        name: "value",
        label: "Default Value",
        minLength: 1,
        maxLength: 50
    },
    {
        type: "textbox",
        name: "placeholder",
        label: "Placeholder",
        minLength: 1,
        maxLength: 50
    },
    {
        type: "integer",
        name: "minLength",
        label: "Min Length",
    },
    {
        type: "integer",
        name: "maxLength",
        label: "Max Length",
    },
];
const textboxFormConfig = {
    title: "Edit Textbox",
    fields: [...baseFields, ...textboxFields]
};
