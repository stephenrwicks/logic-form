"use strict";
const formBuilder = new LogicForm({
    title: 'Form Builder',
    fields: [
        {
            type: 'select',
            name: 'type',
            label: 'Field Type',
            options: [
                { text: 'Textbox', value: 'textbox' },
                { text: 'Textarea', value: 'textarea' },
                { text: 'Integer', value: 'integer' },
                { text: 'Numeric Textbox', value: 'numerictextbox' },
                { text: 'Checkbox', value: 'checkbox' },
                { text: 'Select', value: 'select' },
                { text: 'List', value: 'list' },
                { text: 'Date', value: 'date' },
            ],
            defaultValue: {
                if: [
                    { '==': [{ 'var': 'required' }, false] },
                ], then: 'checkbox', else: 'list'
            },
        },
        {
            type: 'textbox',
            name: 'name',
            label: 'Name / Key (avoid spaces)',
            required: true,
            minLength: 1,
            maxLength: 50,
            defaultValue: 'newField',
        },
        {
            type: 'textbox',
            name: 'label',
            label: 'Label',
            required: true,
            minLength: 1,
            maxLength: 50,
            defaultValue: {
                if: { '==': [{ 'var': 'type' }, 'textbox'] },
                then: 'New Textbox',
                elseif: [
                    {
                        if: { '==': [{ 'var': 'type' }, 'checkbox'] },
                        then: 'New Checkbox',
                    },
                    {
                        if: { '==': [{ 'var': 'type' }, 'textarea'] },
                        then: 'New Textarea',
                    },
                    {
                        if: { '==': [{ 'var': 'type' }, 'integer'] },
                        then: 'New Integer',
                    },
                    {
                        if: { '==': [{ 'var': 'type' }, 'numerictextbox'] },
                        then: 'New Numeric Textbox',
                    },
                    {
                        if: { '==': [{ 'var': 'type' }, 'select'] },
                        then: 'New Select',
                    },
                    {
                        if: { '==': [{ 'var': 'type' }, 'list'] },
                        then: 'New List',
                    }
                ],
                else: 'New Thing'
            },
        },
        {
            type: 'checkbox',
            name: 'required',
            label: 'Required',
            defaultValue: true,
        },
        {
            type: 'checkbox',
            name: 'visible',
            label: 'Visible',
            defaultValue: true,
        },
        {
            type: 'checkbox',
            name: 'disabled',
            label: 'Disabled',
            defaultValue: false
        },
        {
            type: 'textbox',
            name: 'defaultValue',
            label: 'Default Value',
            minLength: 1,
            maxLength: 50,
            visible: {
                'or': [
                    { '==': [{ 'var': 'type' }, 'textbox'] },
                    { '==': [{ 'var': 'type' }, 'textarea'] },
                    { '==': [{ 'var': 'type' }, 'numerictextbox'] },
                    { '==': [{ 'var': 'type' }, 'checkbox'] },
                ]
            }
        },
        {
            type: 'textbox',
            name: 'placeholder',
            label: 'Placeholder',
            minLength: 1,
            maxLength: 50,
            defaultValue: {
                if: {
                    'or': [
                        { '==': [{ 'var': 'type' }, 'textbox'] },
                        { '==': [{ 'var': 'type' }, 'integer'] },
                    ]
                }, then: 'test', else: 'test2'
            },
            visible: {
                'or': [
                    { '==': [{ 'var': 'type' }, 'textbox'] },
                    { '==': [{ 'var': 'type' }, 'textarea'] },
                    { '==': [{ 'var': 'type' }, 'integer'] },
                    { '==': [{ 'var': 'type' }, 'numerictextbox'] },
                ]
            }
        },
        {
            type: 'integer',
            name: 'minLength',
            label: 'Min Length',
            visible: {
                'or': [
                    { '==': [{ 'var': 'type' }, 'textbox'] },
                    { '==': [{ 'var': 'type' }, 'textarea'] },
                    { '==': [{ 'var': 'type' }, 'numerictextbox'] },
                ]
            }
        },
        {
            type: 'integer',
            name: 'maxLength',
            label: 'Max Length',
            visible: {
                'or': [
                    { '==': [{ 'var': 'type' }, 'textbox'] },
                    { '==': [{ 'var': 'type' }, 'textarea'] },
                    { '==': [{ 'var': 'type' }, 'numerictextbox'] },
                ]
            }
        },
        {
            type: 'list',
            name: 'options',
            label: 'Options',
            min: 1,
            max: 5,
            visible: { '==': [{ 'var': 'type' }, 'select'] },
        },
        {
            type: 'integer',
            name: 'min',
            label: 'Min',
            visible: {
                'or': [
                    { '==': [{ 'var': 'type' }, 'integer'] },
                    { '==': [{ 'var': 'type' }, 'list'] },
                ]
            }
        },
        {
            type: 'integer',
            name: 'max',
            label: 'Max',
            visible: {
                'or': [
                    { '==': [{ 'var': 'type' }, 'integer'] },
                    { '==': [{ 'var': 'type' }, 'list'] },
                ]
            }
        },
    ]
});
const pre = document.createElement('pre');
const htmlDiv = document.createElement('div');
htmlDiv.replaceChildren('Use this HTML to generate the above sample form: ', pre);
htmlDiv.style.gridColumn = 'span 2';
const update = () => {
    const formBuilderValue = formBuilder.getValue();
    sampleForm.setConfig({
        title: 'Generated Form',
        fields: [
            formBuilderValue
        ]
    });
    pre.innerText = `<logic-form data-theme='green' data-config='{
title: 'Sample Form', 
fields: [${JSON.stringify(formBuilderValue, null, 4)}]
'></logic-form>`;
};
formBuilder.addEventListener('logic-form-update', update);
const sampleForm = new LogicForm({ title: 'Generated Form', fields: [] });
sampleForm.id = 'sample-form';
sampleForm.dataset.theme = 'green';
const grid = document.createElement('div');
grid.style.display = 'grid';
grid.style.gridTemplateColumns = '2fr 3fr';
grid.style.gap = '3rem';
grid.replaceChildren(formBuilder, sampleForm, htmlDiv);
document.body.replaceChildren(grid);
update();
const getterButton = document.createElement('button');
getterButton.addEventListener('click', () => {
    console.log(document.querySelector('#sample-form').$[formBuilder.$.name]);
});
getterButton.textContent = `Fire a getter to show the value of the sample field: console.log(document.querySelector('#sample-form').$.${formBuilder.$.name});`;
sampleForm.addEventListener('logic-form-update', () => {
    getterButton.textContent = `Fire a getter to show the value of the sample field: console.log(document.querySelector('#sample-form').$.${formBuilder.$.name});`;
});
htmlDiv.append(getterButton);
