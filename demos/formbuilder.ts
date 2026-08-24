
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
            defaultValue: 'textbox'
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
                if: [{ field: 'type' }, '==', 'textbox'],
                then: 'New Textbox',
                elseif: [
                    {
                        if: [{ field: 'type' }, '==', 'checkbox'],
                        then: 'New Checkbox',
                    },
                    {
                        if: [{ field: 'type' }, '==', 'textarea'],
                        then: 'New Textarea',
                    },
                    {
                        if: [{ field: 'type' }, '==', 'integer'],
                        then: 'New Integer',
                    },
                    {
                        if: [{ field: 'type' }, '==', 'numerictextbox'],
                        then: 'New Numeric Textbox',
                    },
                    {
                        if: [{ field: 'type' }, '==', 'select'],
                        then: 'New Select',
                    },
                    {
                        if: [{ field: 'type' }, '==', 'list'],
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
                or: [
                    [{ field: 'type' }, '==', 'textbox'],
                    [{ field: 'type' }, '==', 'textarea'],
                    [{ field: 'type' }, '==', 'numerictextbox'],
                    [{ field: 'type' }, '==', 'checkbox'],
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
                    or: [
                        [{ field: 'type' }, '==', 'textbox'],
                        [{ field: 'type' }, '==', 'integer'],
                    ]
                },
                then: 'test',
                else: 'test2'
            },
            visible: {
                or: [
                    [{ field: 'type' }, '==', 'textbox'],
                    [{ field: 'type' }, '==', 'textarea'],
                    [{ field: 'type' }, '==', 'integer'],
                    [{ field: 'type' }, '==', 'numerictextbox'],
                ]
            }
        },
        {
            type: 'integer',
            name: 'minLength',
            label: 'Min Length',
            visible: {
                or: [
                    [{ field: 'type' }, '==', 'textbox'],
                    [{ field: 'type' }, '==', 'textarea'],
                    [{ field: 'type' }, '==', 'numerictextbox'],
                ]
            }
        },
        {
            type: 'integer',
            name: 'maxLength',
            label: 'Max Length',
            visible: {
                or: [
                    [{ field: 'type' }, '==', 'textbox'],
                    [{ field: 'type' }, '==', 'textarea'],
                    [{ field: 'type' }, '==', 'numerictextbox'],
                ]
            }
        },
        {
            type: 'list',
            name: 'options',
            label: 'Options',
            min: 1,
            max: 5,
            visible: [{ field: 'type' }, '==', 'select'],
        },
        {
            type: 'integer',
            name: 'min',
            label: 'Min',
            visible: {
                or: [
                    [{ field: 'type' }, '==', 'integer'],
                    [{ field: 'type' }, '==', 'list'],
                ]
            }
        },
        {
            type: 'integer',
            name: 'max',
            label: 'Max',
            visible: {
                or: [
                    [{ field: 'type' }, '==', 'integer'],
                    [{ field: 'type' }, '==', 'list'],
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
    // Is only one field at the moment but with repeatable sections this could be Field[]
    const formBuilderValue = formBuilder.getValue() as Field;
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
    console.log((document.querySelector('#sample-form') as LogicForm).$[formBuilder.$.name]);
});

getterButton.textContent = `Fire a getter to show the value of the sample field: console.log(document.querySelector('#sample-form').$.${formBuilder.$.name});`;

sampleForm.addEventListener('logic-form-update', () => {
    getterButton.textContent = `Fire a getter to show the value of the sample field: console.log(document.querySelector('#sample-form').$.${formBuilder.$.name});`;
});


htmlDiv.append(getterButton);