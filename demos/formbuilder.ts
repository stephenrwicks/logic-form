
const formBuilder = new LogicForm(formBuilderConfig);
const pre = document.createElement('pre');
const htmlDiv = document.createElement('div');
htmlDiv.replaceChildren('Use this HTML to generate the above sample form: ', pre);
htmlDiv.style.gridColumn = 'span 2';

const update = () => {
    // Is only one field at the moment but with repeatable sections this could be Field[]
    const formBuilderValue = formBuilder.getValue() as Field;
    sampleForm.setConfig({
        title: 'Sample form',
        fields: [
            formBuilderValue
        ]
    });
    pre.innerText = `<logic-form data-theme="green" data-config='{
title: "Sample Form", 
fields: [${JSON.stringify(formBuilderValue, null, 4)}]
'></logic-form>`;
};
formBuilder.addEventListener('logic-form-update', update);
const sampleForm = new LogicForm({ title: 'Sample form', fields: [] });
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