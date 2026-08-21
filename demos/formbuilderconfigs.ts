const baseFields: Field[] = [
    {
        type: "select",
        name: "type",
        label: "Field Type",
        options: [
            { text: "Textbox", value: "textbox" },
            { text: "Textarea", value: "textarea" },
            { text: "Numeric Textbox (Zipcodes, etc.)", value: "numerictextbox" },
            { text: "Checkbox", value: "checkbox" },
            { text: "Select", value: "select" },
            { text: "List", value: "list" },
        ],
    },
    {
        type: "textbox",
        name: "name",
        label: "Name",
        required: true,
        minLength: 1,
        maxLength: 50,
        value: "newField"
    },
    {
        type: "textbox",
        name: "label",
        label: "Label",
        required: true,
        minLength: 1,
        maxLength: 50,
        value: "New Field"
    },
    // These next three should be able to toggle between a boolean or some kind of Rule subform.
    // Maybe we use a radiogroup to toggle between them.
    {
        type: "checkbox",
        name: "required",
        label: "Required",
        value: true,
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
        label: "Disabled",
        value: false
    }
];

const checkboxFields: Field[] = [
    // {
    //     type: "checkbox",
    //     name: "value",
    //     label: "Checked by default",
    //     visible: [
    //         { "==": [{ "var": "type" }, "checkbox"] },
    //     ]
    // },
];


const textboxFields: Field[] = [
    {
        type: "textbox",
        name: "value",
        label: "Default Value",
        minLength: 1,
        maxLength: 50,
        visible: [
            {
                "or":
                    [
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
        visible: [
            {
                "or":
                    [
                        { "==": [{ "var": "type" }, "textbox"] },
                        { "==": [{ "var": "type" }, "textarea"] },
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
                "or":
                    [
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
                "or":
                    [
                        { "==": [{ "var": "type" }, "textbox"] },
                        { "==": [{ "var": "type" }, "textarea"] },
                        { "==": [{ "var": "type" }, "numerictextbox"] },
                    ]
            }
        ]
    },
];

const selectFields: Field[] = [
    // Using a list to describe options doesn't work because it returns an array of strings. But it should map to options objects
    // This is true for select, radio, and checkboxgroup.
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

const listFields: Field[] = [
    {
        type: "integer",
        name: "min",
        label: "Min",
        visible: [
            { "==": [{ "var": "type" }, "list"] },
        ]
    },
    {
        type: "integer",
        name: "max",
        label: "Max",
        visible: [
            { "==": [{ "var": "type" }, "list"] },
        ]
    },
];

const formBuilderConfig: Config = {
    title: "Form Builder",
    fields: [...baseFields, ...textboxFields, ...checkboxFields, ...selectFields, ...listFields]
}