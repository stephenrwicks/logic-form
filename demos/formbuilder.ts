
const textboxForm = new LogicForm(textboxFormConfig);
const pre = document.querySelector('#pre');
const htmlDiv = document.createElement('div');

const update = (e?: Event) => {
    //if (pre) pre.textContent = JSON.stringify(textboxForm.getValue(), null, 4);
    if (e) console.log((e as CustomEvent).detail.input);
    sampleForm.setConfig({
        title: 'Sample form',
        fields: [
            textboxForm.getValue() as Field
        ]
    });
    htmlDiv.innerText = `
        Use this HTML to generate the above sample form: 

        <logic-form data-config='{title: "Sample Form", 
        fields: [${JSON.stringify(textboxForm.getValue(), null, 4)}]
        '></logic-form>
    `

};
textboxForm.addEventListener('logic-form-update', update);
const sampleForm = new LogicForm({ title: 'Sample form', fields: [] });
const grid = document.createElement('div');
grid.style.display = 'grid';
grid.style.gridTemplateColumns = '1fr 1fr';
grid.style.gap = '5rem';

grid.append(textboxForm, sampleForm, htmlDiv);
document.body.append(grid);
setTimeout(update);
