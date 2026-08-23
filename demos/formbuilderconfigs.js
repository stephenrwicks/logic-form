"use strict";
const baseFields = [
    {
        type: "select",
        name: "type",
        label: "Field Type",
        options: [
            { text: "Textbox", value: "textbox" },
            { text: "Textarea", value: "textarea" },
            { text: "Integer", value: "integer" },
            { text: "Numeric Textbox", value: "numerictextbox" },
            { text: "Checkbox", value: "checkbox" },
            { text: "Select", value: "select" },
            { text: "List", value: "list" },
            { text: "Date", value: "date" },
        ],
        defaultValue: {
            if: [
                { "==": [{ "var": "required" }, true] },
            ], then: "checkbox", else: "list"
        },
    },
    {
        type: "textbox",
        name: "name",
        label: "Name / Key (avoid spaces)",
        required: true,
        minLength: 1,
        maxLength: 50,
        defaultValue: 'newField',
    },
    {
        type: "textbox",
        name: "label",
        label: "Label",
        required: true,
        minLength: 1,
        maxLength: 50,
        defaultValue: {
            if: [
                { "==": [{ "var": "type" }, 'checkbox'] },
            ],
            then: "New Checkbox",
            elseif: [
                {
                    if: [
                        { "==": [{ "var": "type" }, 'textbox'] },
                    ],
                    then: "New Textbox",
                }
            ],
            else: "New Something Else"
        },
    },
    {
        type: "checkbox",
        name: "required",
        label: "Required",
        defaultValue: true,
    },
    {
        type: "checkbox",
        name: "visible",
        label: "Visible",
        defaultValue: true,
    },
    {
        type: "checkbox",
        name: "disabled",
        label: "Disabled",
        defaultValue: false
    }
];
const checkboxFields = [];
const textboxFields = [
    {
        type: 'textbox',
        name: "value",
        label: "Default Value",
        minLength: 1,
        maxLength: 50,
        visible: [
            {
                "or": [
                    { "==": [{ "var": "type" }, "textbox"] },
                    { "==": [{ "var": "type" }, "textarea"] },
                    { "==": [{ "var": "type" }, "numerictextbox"] },
                    { "==": [{ "var": "type" }, "checkbox"] },
                ]
            }
        ]
    },
    {
        type: "textbox",
        name: "placeholder",
        label: "Placeholder",
        minLength: 1,
        maxLength: 50,
        defaultValue: {
            if: [
                {
                    "or": [
                        { "==": [{ "var": "type" }, "textbox"] },
                        { "==": [{ "var": "type" }, "integer"] },
                    ]
                }
            ], then: "test", else: "test2"
        },
        visible: [
            {
                "or": [
                    { "==": [{ "var": "type" }, "textbox"] },
                    { "==": [{ "var": "type" }, "textarea"] },
                    { "==": [{ "var": "type" }, "integer"] },
                    { "==": [{ "var": "type" }, "numerictextbox"] },
                ]
            }
        ]
    },
    {
        type: "integer",
        name: "minLength",
        label: "Min Length",
        visible: [
            {
                "or": [
                    { "==": [{ "var": "type" }, "textbox"] },
                    { "==": [{ "var": "type" }, "textarea"] },
                    { "==": [{ "var": "type" }, "numerictextbox"] },
                ]
            }
        ]
    },
    {
        type: "integer",
        name: "maxLength",
        label: "Max Length",
        visible: [
            {
                "or": [
                    { "==": [{ "var": "type" }, "textbox"] },
                    { "==": [{ "var": "type" }, "textarea"] },
                    { "==": [{ "var": "type" }, "numerictextbox"] },
                ]
            }
        ]
    },
];
const selectFields = [
    {
        type: "list",
        name: "options",
        label: "Options",
        min: 1,
        max: 5,
        visible: [
            { "==": [{ "var": "type" }, "select"] }
        ],
    },
];
const minAndMax = [
    {
        type: "integer",
        name: "min",
        label: "Min",
        visible: [
            {
                "or": [
                    { "==": [{ "var": "type" }, "integer"] },
                    { "==": [{ "var": "type" }, "list"] },
                ]
            }
        ]
    },
    {
        type: "integer",
        name: "max",
        label: "Max",
        visible: [
            {
                "or": [
                    { "==": [{ "var": "type" }, "integer"] },
                    { "==": [{ "var": "type" }, "list"] },
                ]
            }
        ]
    },
];
const formBuilderConfig = {
    title: "Form Builder",
    fields: [...baseFields, ...textboxFields, ...checkboxFields, ...selectFields, ...minAndMax]
};
