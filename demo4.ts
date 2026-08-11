const x = new LogicForm({
    title: 'Basic Form Field Demo',
    fields: [
        // --------------------
        // Textbox
        // --------------------
        {
            type: 'textbox',
            name: 'fullNameRequired',
            label: 'Full Name (textbox, required)',
            required: true,
            value: 'a'
        },

        {
            type: 'textbox',
            name: 'fullNameOptional',
            label: 'Full Name (textbox, not required)',
            required: false,
            value: 'a'
        },

        // --------------------
        // Textarea
        // --------------------
        {
            type: 'textarea',
            name: 'commentsRequired',
            label: 'Comments (textarea, required)',
            value: 'aaa',
            required: true,
        },

        {
            type: 'textarea',
            name: 'commentsOptional',
            label: 'Comments (textarea, not required)',
            value: 'aaa',
            required: false,
        },

        // --------------------
        // Checkbox
        // --------------------
        {
            type: 'checkbox',
            name: 'subscribeRequired',
            label: 'Subscribe to newsletter (checkbox, required)',
            value: true,
            required: true,
        },

        {
            type: 'checkbox',
            name: 'subscribeOptional',
            label: 'Subscribe to newsletter (checkbox, not required)',
            value: true,
            required: false,
        },

        // --------------------
        // Select
        // --------------------
        {
            type: 'select',
            name: 'favoriteColorRequired',
            label: 'Favorite Color (select, required)',
            value: 'red',
            required: true,
            options: [
                { text: 'Red', value: 'red' },
                { text: 'Green', value: 'green' },
                { text: 'Blue', value: 'blue' },
            ],
        },

        {
            type: 'select',
            name: 'favoriteColorOptional',
            label: 'Favorite Color (select, not required)',
            value: 'red',
            required: false,
            options: [
                { text: 'Red', value: 'red' },
                { text: 'Green', value: 'green' },
                { text: 'Blue', value: 'blue' },
            ],
        },

        // --------------------
        // Numeric textbox
        // --------------------
        // {
        //     type: 'numerictextbox',
        //     name: 'ageRequired',
        //     label: 'Age (numerictextbox, required)',
        //     value: '',
        //     required: true,
        // },

        // {
        //     type: 'numerictextbox',
        //     name: 'ageOptional',
        //     label: 'Age (numerictextbox, not required)',
        //     value: '',
        //     required: false,
        // },

        // --------------------
        // Integer
        // --------------------
        {
            type: 'integer',
            name: 'householdSizeRequired',
            label: 'Household Size (integer, required)',
            value: 1,
            required: true,
        },

        {
            type: 'integer',
            name: 'householdSizeOptional',
            label: 'Household Size (integer, not required)',
            value: 1,
            required: false,
        },

        // --------------------
        // Decimal
        // --------------------
        {
            type: 'decimal',
            name: 'annualIncomeRequired',
            label: 'Annual Income (decimal, required)',
            value: 1,
            required: true,
        },

        {
            type: 'decimal',
            name: 'annualIncomeOptional',
            label: 'Annual Income (decimal, not required)',
            value: 0,
            required: false,
        },

        // --------------------
        // Checkbox group
        // --------------------
        {
            type: 'checkboxgroup',
            name: 'interestsRequired',
            label: 'Interests (checkboxgroup, required)',
            value: [],
            required: true,
            options: [
                { text: 'Books', value: 'books' },
                { text: 'Movies', value: 'movies' },
                { text: 'Music', value: 'music' },
            ],
        },

        {
            type: 'checkboxgroup',
            name: 'interestsOptional',
            label: 'Interests (checkboxgroup, not required)',
            value: [],
            required: false,
            min: 2,
            options: [
                { text: 'Books', value: 'books' },
                { text: 'Movies', value: 'movies' },
                { text: 'Music', value: 'music' },
            ],
        },

        // --------------------
        // Radio group
        // --------------------
        {
            type: 'radiogroup',
            name: 'contactPreferenceRequired',
            label: 'Preferred Contact Method (radiogroup, required)',
            //value: 'email',
            required: true,
            options: [
                { text: 'Email', value: 'email' },
                { text: 'Phone', value: 'phone' },
                { text: 'Mail', value: 'mail' },
            ],
        },

        {
            type: 'radiogroup',
            name: 'contactPreferenceOptional',
            label: 'Preferred Contact Method (radiogroup, not required)',
            value: 'email',
            required: false,
            options: [
                { text: 'Email', value: 'email' },
                { text: 'Phone', value: 'phone' },
                { text: 'Mail', value: 'mail' },
            ],
        },
        // --------------------
        // List
        // --------------------
        {
            type: 'list',
            name: 'listTest',
            label: 'List Test',
            value: ['stephen', 'grace', 'julia', 'lenore'],
            required: false,
            min: 2,
            max: 3,
        },
    ],
});

document.body.append(x);
