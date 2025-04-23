// static/js/ui.js

// Global references to UI components
let datePickerInstances = [];

// Add this helper function at the top of the file
function getEnumBadgeClass(index, total) {
    // Define a set of bootstrap color classes
    const colorClasses = [
        'bg-primary',
        'bg-success',
        'bg-info',
        'bg-warning text-dark',
        'bg-danger',
        'bg-secondary'
    ];
    
    // Use modulo to cycle through colors if there are more enum values than colors
    return colorClasses[index % colorClasses.length];
}

/**
 * Setup UI components
 * @param {Array} modelMetadata Model metadata
 * @param {Function} activateModelCallback Callback to activate a model
 */
export function setupUI(modelMetadata, activateModelCallback) {
    setupSidebar(modelMetadata, activateModelCallback);
    setupModalEventListeners();
}

/**
 * Setup sidebar navigation
 * @param {Array} modelMetadata Model metadata
 * @param {Function} activateModelCallback Callback to activate a model
 */
function setupSidebar(modelMetadata, activateModelCallback) {
    const sidebarMenu = document.getElementById('sidebar-menu');
    sidebarMenu.innerHTML = '';

    modelMetadata.forEach(model => {
        const navItem = document.createElement('a');
        navItem.href = '#';
        navItem.className = 'list-group-item list-group-item-action sidebar-item';
        navItem.id = `${model.name}-nav`;
        navItem.innerHTML = `<i class="${model.icon}"></i> ${model.display_name}`;

        navItem.addEventListener('click', function(e) {
            e.preventDefault();

            // Remove active class from all nav items
            const navItems = document.querySelectorAll('.sidebar-item');
            navItems.forEach(item => item.classList.remove('active'));

            // Add active class to clicked item
            this.classList.add('active');

            // Activate the model
            activateModelCallback(model.name);

            // On mobile, close the sidebar after navigation
            if (window.innerWidth < 768) {
                document.body.classList.toggle('sidebar-toggled');
            }
        });

        sidebarMenu.appendChild(navItem);
    });

    // Setup sidebar toggle behavior
    const menuToggle = document.getElementById('menu-toggle');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    menuToggle.addEventListener('click', toggleSidebar);
    closeSidebarBtn.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);
}

/**
 * Toggle sidebar visibility
 */
function toggleSidebar() {
    document.body.classList.toggle('sidebar-toggled');
}

/**
 * Setup modal event listeners
 */
function setupModalEventListeners() {
    // Add item button
    document.getElementById('add-item-btn').addEventListener('click', function() {
        // Reset form
        document.getElementById('item-form').reset();
        document.getElementById('item-id').value = '';

        // Setup UI
        document.getElementById('itemFormModalLabel').textContent = 'Add New Item';
        document.getElementById('save-item-btn').textContent = 'Add';

        // Build form
        const activeModelNav = document.querySelector('.sidebar-item.active');
        if (activeModelNav) {
            const modelName = activeModelNav.id.replace('-nav', '');
            const modelMetadata = getModelMetadata();
            buildItemForm(modelMetadata.find(m => m.name === modelName));
        }

        // Show modal
        const itemFormModal = new bootstrap.Modal(document.getElementById('itemFormModal'));
        itemFormModal.show();
    });

    // Initialize datepickers when modal is shown
    document.getElementById('itemFormModal').addEventListener('shown.bs.modal', initializeDatepickers);
}

/**
 * Initialize datepickers for date fields
 */
export function initializeDatepickers() {
    // First destroy any existing datepicker instances
    datePickerInstances.forEach(picker => {
        if (picker && typeof picker.destroy === 'function') {
            picker.destroy();
        }
    });
    datePickerInstances = [];

    // Find all date input fields in the form
    const dateInputs = document.querySelectorAll('input[data-type="date"]');

    // Initialize a datepicker for each date field
    dateInputs.forEach(input => {
        const datePicker = flatpickr(input, {
            dateFormat: "Y-m-d",
            allowInput: true,
            altInput: true,
            altFormat: "F j, Y",
            onChange: function(selectedDates, dateStr) {
                // Make sure the input has the value
                input.value = dateStr;
            }
        });

        // Find the associated calendar icon and add click handler
        const parentGroup = input.closest('.date-input-group');
        if (parentGroup) {
            const calendarIcon = parentGroup.querySelector('.calendar-icon');
            if (calendarIcon) {
                calendarIcon.addEventListener('click', () => {
                    datePicker.open();
                });
            }
        }

        // Store the datepicker instance for cleanup
        datePickerInstances.push(datePicker);
    });

    // Expose function to initialize a specific datepicker with a value
    window.initializeDatepicker = function(inputElement, dateValue) {
        const datePicker = datePickerInstances.find(picker =>
            picker.element && picker.element.id === inputElement.id
        );

        if (datePicker) {
            datePicker.setDate(dateValue);

            // Also make sure the input field has the value
            inputElement.value = dateValue;
        }
    };
}

/**
 * Render items table
 * @param {Array} items Items to render
 * @param {Object} model Model metadata
 * @param {Function} editCallback Edit callback
 * @param {Function} deleteCallback Delete callback
 */
export function renderItems(items, model, editCallback, deleteCallback) {
    const contentContainer = document.getElementById('content-container');

    // Create table
    const tableHtml = `
        <div class="card">
            <div class="card-header bg-light">
                <h5 class="mb-0">${model.display_name}</h5>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                ${model.fields.map(field =>
                                    `<th>${field.display_name}</th>`
                                ).join('')}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="items-table-body">
                            ${items.length === 0 ?
                                `<tr><td colspan="${model.fields.length + 1}" class="text-center">No ${model.display_name.toLowerCase()} found</td></tr>` :
                                ''}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    contentContainer.innerHTML = tableHtml;

    const tableBody = document.getElementById('items-table-body');

    if (items.length > 0) {
        items.forEach(item => {
            const row = document.createElement('tr');

            // Add data cells
            model.fields.forEach(field => {
                const cell = document.createElement('td');

                if (field.name === 'id') {
                    cell.innerHTML = `<span class="badge bg-secondary">${item[field.name].substring(0, 8)}...</span>`;
                } else if (field.type === 'enum') {
                    const value = item[field.name] || '-';
                    
                    // Find the option index to determine color
                    const optionIndex = field.options?.findIndex(opt => 
                        opt.value === value || opt.name === value
                    ) ?? -1;
                    
                    const badgeClass = optionIndex >= 0 ? 
                        getEnumBadgeClass(optionIndex, field.options?.length ?? 0) : 
                        'bg-secondary';

                    cell.innerHTML = `<span class="badge ${badgeClass}">${value}</span>`;
                } else if (field.type === 'datetime') {
                    cell.textContent = item[field.name] ? formatDate(item[field.name]) : '-';
                } else if (field.type === 'date') {
                    cell.textContent = item[field.name] ? formatDateOnly(item[field.name]) : '-';
                } else if (field.type === 'boolean') {
                    cell.innerHTML = item[field.name] ?
                        '<span class="badge bg-success">Yes</span>' :
                        '<span class="badge bg-secondary">No</span>';
                } else {
                    cell.textContent = item[field.name];
                }

                row.appendChild(cell);
            });

            // Add actions cell
            const actionsCell = document.createElement('td');
            actionsCell.innerHTML = `
                <span class="user-action text-primary" onclick="editItem('${item.id}')">
                    <i class="bi bi-pencil"></i> Edit
                </span>
                <span class="user-action text-danger" onclick="deleteItem('${item.id}')">
                    <i class="bi bi-trash"></i> Delete
                </span>
            `;
            row.appendChild(actionsCell);

            tableBody.appendChild(row);
        });
    }
}

/**
 * Build form fields for a model
 * @param {Object} model Model metadata
 * @param {Object} enumOptions Enum options
 */
export function buildItemForm(model, enumOptions) {
    const formFieldsContainer = document.getElementById('form-fields-container');
    formFieldsContainer.innerHTML = '';

    // Create form fields based on model metadata
    model.fields.forEach(field => {
        // Skip non-editable fields
        if (!field.editable) return;

        const fieldId = `item-${field.name}`;
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'mb-3';

        // Create label
        const label = document.createElement('label');
        label.htmlFor = fieldId;
        label.className = 'form-label';
        label.textContent = field.display_name;
        if (field.required) {
            label.innerHTML += ' <span class="text-danger">*</span>';
        }

        // Create input based on field type
        let input;

        if (field.type === 'boolean') {
            // Create checkbox for boolean fields
            fieldDiv.className = 'mb-3 form-check form-check-lg';

            input = document.createElement('input');
            input.type = 'checkbox';
            input.className = 'form-check-input';
            input.id = fieldId;

            // Move label after input for checkbox
            fieldDiv.appendChild(input);
            fieldDiv.appendChild(label);
        } else if (field.type === 'date') {
            // Date field with datepicker
            fieldDiv.appendChild(label);

            // Create date input group
            const inputGroup = document.createElement('div');
            inputGroup.className = 'date-input-group';

            input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control';
            input.id = fieldId;
            input.placeholder = 'YYYY-MM-DD';
            input.setAttribute('data-type', 'date'); // Add attribute to identify date fields

            if (field.required) {
                input.required = true;
            }

            const calendarIcon = document.createElement('span');
            calendarIcon.className = 'calendar-icon';
            calendarIcon.innerHTML = '<i class="bi bi-calendar"></i>';

            inputGroup.appendChild(input);
            inputGroup.appendChild(calendarIcon);

            fieldDiv.appendChild(inputGroup);
        } else if (field.type === 'enum') {
            // Create dropdown for enum fields
            fieldDiv.appendChild(label);

            input = document.createElement('select');
            input.className = 'form-select';
            input.id = fieldId;

            if (field.required) {
                input.required = true;
            }

            // Add empty option for optional fields
            if (!field.required) {
                const emptyOption = document.createElement('option');
                emptyOption.value = '';
                emptyOption.textContent = 'Select...';
                input.appendChild(emptyOption);
            } else {
                // Add placeholder option for required fields
                const placeholderOption = document.createElement('option');
                placeholderOption.value = '';
                placeholderOption.textContent = `Select ${field.display_name}...`;
                placeholderOption.disabled = true;
                placeholderOption.selected = true;
                input.appendChild(placeholderOption);
            }

            // Add options from enum data
            if (field.enum_name && enumOptions[field.enum_name]) {
                enumOptions[field.enum_name].forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option.value;
                    optionElement.textContent = option.name;
                    input.appendChild(optionElement);
                });
            }

            fieldDiv.appendChild(input);
        } else {
            fieldDiv.appendChild(label);

            // Create input for other field types
            input = document.createElement('input');
            input.type = field.type === 'email' ? 'email' : 'text';
            input.className = 'form-control';
            input.id = fieldId;

            if (field.required) {
                input.required = true;
            }

            fieldDiv.appendChild(input);
        }

        // Add validation error display
        if (field.type !== 'boolean') {
            const errorFeedback = document.createElement('div');
            errorFeedback.className = 'invalid-feedback';
            errorFeedback.id = `${fieldId}-error`;
            errorFeedback.textContent = `Please enter a valid ${field.display_name.toLowerCase()}`;
            fieldDiv.appendChild(errorFeedback);
        }

        formFieldsContainer.appendChild(fieldDiv);
    });
}

/**
 * Show a toast notification
 * @param {string} title Toast title
 * @param {string} message Toast message
 * @param {string} type Toast type (success, danger, warning, info)
 */
export function showToast(title, message, type = 'info') {
    const toastEl = document.getElementById('toast');
    const toastTitle = document.getElementById('toast-title');
    const toastMessage = document.getElementById('toast-message');

    toastTitle.textContent = title;
    toastMessage.textContent = message;

    // Remove existing color classes
    toastEl.className = 'toast';

    // Add color based on type
    if (type === 'success') {
        toastEl.classList.add('bg-success', 'text-white');
    } else if (type === 'danger') {
        toastEl.classList.add('bg-danger', 'text-white');
    } else if (type === 'warning') {
        toastEl.classList.add('bg-warning');
    } else {
        toastEl.classList.add('bg-info', 'text-white');
    }

    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

/**
 * Show loading spinner
 */
export function showLoading() {
    document.getElementById('loading-spinner').classList.remove('d-none');
}

/**
 * Hide loading spinner
 */
export function hideLoading() {
    document.getElementById('loading-spinner').classList.add('d-none');
}

/**
 * Format date with time
 * @param {string} dateString Date string
 * @returns {string} Formatted date
 */
export function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

/**
 * Format date only (without time)
 * @param {string} dateString Date string
 * @returns {string} Formatted date
 */
export function formatDateOnly(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}