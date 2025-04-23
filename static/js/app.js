// static/app.js
document.addEventListener('DOMContentLoaded', async function() {
    // DOM elements - Core UI
    const sidebarMenu = document.getElementById('sidebar-menu');
    const contentContainer = document.getElementById('content-container');
    const pageTitle = document.getElementById('page-title');
    const addItemBtn = document.getElementById('add-item-btn');
    const loadingSpinner = document.getElementById('loading-spinner');

    // DOM elements - Sidebar
    const menuToggle = document.getElementById('menu-toggle');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    // DOM elements - Form modal
    const itemForm = document.getElementById('item-form');
    const itemIdInput = document.getElementById('item-id');
    const formFieldsContainer = document.getElementById('form-fields-container');
    const saveItemBtn = document.getElementById('save-item-btn');
    const itemFormModal = new bootstrap.Modal(document.getElementById('itemFormModal'));
    const itemFormModalEl = document.getElementById('itemFormModal');
    const itemFormModalTitle = document.getElementById('itemFormModalLabel');

    // DOM elements - Delete modal
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    const confirmDeleteBtn = document.getElementById('confirm-delete');

    // DOM elements - Error display
    const formErrorAlert = document.getElementById('form-error-alert');
    const formErrorMessage = document.getElementById('form-error-message');

    // DOM elements - Toast
    const toast = new bootstrap.Toast(document.getElementById('toast'));
    const toastTitle = document.getElementById('toast-title');
    const toastMessage = document.getElementById('toast-message');

    // Add these variables at the top of your file
    let currentPage = 1;
    let pageSize = 10;
    let totalItems = 0;

    // Set initial page size from select
    const pageSizeSelect = document.getElementById('page-size');
    if (pageSizeSelect) {
        pageSize = parseInt(pageSizeSelect.value);
    }

    // State variables
    let activeModel = null; // Current active model
    let modelMetadata = []; // Metadata for all models
    let isEditMode = false; // Form mode
    let itemToDelete = null; // Item to delete
    let formValidators = {}; // Custom form validators
    let datePickerInstances = []; // Track datepicker instances

    // Initialize the application
    init();

    // Initialize the application
    async function init() {
        try {
            showLoading();
            // Fetch model metadata
            await fetchMetadata();

            // Setup sidebar navigation
            setupSidebar();

            // Setup event listeners
            setupEventListeners();

            // Activate first model by default
            if (modelMetadata.length > 0) {
                activateModel(modelMetadata[0].name);
            }

            hideLoading();
        } catch (error) {
            console.error('Initialization error:', error);
            showToast('Error', 'Failed to initialize the application', 'danger');
            hideLoading();
        }
    }

    // Fetch metadata for all models
    async function fetchMetadata() {
        const response = await fetch('/api/metadata');
        if (!response.ok) {
            throw new Error('Failed to fetch model metadata');
        }
        const data = await response.json();
        modelMetadata = data.models;
    }

    // Setup sidebar navigation
    function setupSidebar() {
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
                activateModel(model.name);

                // On mobile, close the sidebar after navigation
                if (window.innerWidth < 768) {
                    toggleSidebar();
                }
            });

            sidebarMenu.appendChild(navItem);
        });
    }

    // Setup event listeners
    function setupEventListeners() {
        // Sidebar toggle
        menuToggle.addEventListener('click', toggleSidebar);
        closeSidebarBtn.addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', toggleSidebar);

        // Add item button
        addItemBtn.addEventListener('click', openAddItemModal);

        // Save item button
        saveItemBtn.addEventListener('click', handleFormSubmit);

        // Confirm delete button
        confirmDeleteBtn.addEventListener('click', confirmDelete);

        // Reset form when modal is closed
        itemFormModalEl.addEventListener('hidden.bs.modal', resetForm);

        // Initialize datepickers when modal is shown
        itemFormModalEl.addEventListener('shown.bs.modal', initializeDatepickers);
    }

    // Toggle sidebar
    function toggleSidebar() {
        document.body.classList.toggle('sidebar-toggled');
    }

    // Activate a model
    async function activateModel(modelName) {
        try {
            showLoading();

            // Update state
            activeModel = modelName;

            // Get model metadata
            const model = getModelMetadata(modelName);

            // Update UI
            pageTitle.textContent = model.display_name;
            addItemBtn.innerHTML = `<i class="bi bi-plus-circle"></i> Add ${model.display_name.slice(0, -1)}`;

            // Fetch items
            await loadItems();

            hideLoading();
        } catch (error) {
            console.error(`Error activating model ${modelName}:`, error);
            showToast('Error', `Failed to load ${modelName}`, 'danger');
            hideLoading();
        }
    }

    // Get model metadata by name
    function getModelMetadata(modelName) {
        return modelMetadata.find(model => model.name === modelName);
    }

    // Load items for the active model
    async function loadItems() {
        try {
            showLoading();
            const skip = (currentPage - 1) * pageSize;
            const response = await fetch(`/api/${activeModel}/?skip=${skip}&limit=${pageSize}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch ${activeModel}`);
            }

            const data = await response.json();
            totalItems = data.total;
            renderItems(data.items);
            renderPagination();
            hideLoading();
        } catch (error) {
            console.error(`Error loading ${activeModel}:`, error);
            contentContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Failed to load data. Please try again later.
                </div>
            `;
            hideLoading();
        }
    }

    function renderPagination() {
        const totalPages = Math.ceil(totalItems / pageSize);
        const paginationEl = document.getElementById('pagination');
        const paginationInfo = document.getElementById('pagination-info');
        
        // Update pagination info
        const start = ((currentPage - 1) * pageSize) + 1;
        const end = Math.min(currentPage * pageSize, totalItems);
        paginationInfo.textContent = `Showing ${start}-${end} of ${totalItems}`;
        
        // Generate pagination buttons
        let html = '';
        
        // First page button
        html += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="1" aria-label="First page">
                    <i class="bi bi-chevron-double-left"></i>
                </a>
            </li>
        `;
        
        // Previous button
        html += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous">
                    <i class="bi bi-chevron-left"></i>
                </a>
            </li>
        `;
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 || // First page
                i === totalPages || // Last page
                (i >= currentPage - 2 && i <= currentPage + 2) // Pages around current
            ) {
                html += `
                    <li class="page-item ${i === currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
            } else if (
                i === currentPage - 3 ||
                i === currentPage + 3
            ) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }
        
        // Next button
        html += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next">
                    <i class="bi bi-chevron-right"></i>
                </a>
            </li>
        `;
        
        // Last page button
        html += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${totalPages}" aria-label="Last page">
                    <i class="bi bi-chevron-double-right"></i>
                </a>
            </li>
        `;
        
        paginationEl.innerHTML = html;
        
        // Add event listeners to all pagination buttons
        paginationEl.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const newPage = parseInt(e.target.closest('.page-link').dataset.page);
                if (!isNaN(newPage) && newPage !== currentPage) {
                    currentPage = newPage;
                    loadItems();
                }
            });
        });

        // Add page size change handler
        document.getElementById('page-size').addEventListener('change', (e) => {
            pageSize = parseInt(e.target.value);
            currentPage = 1;  // Reset to first page
            loadItems();
        });
    }

    // Render items table
    function renderItems(items) {
        const model = getModelMetadata(activeModel);

        // Reorder fields to put updated_at last
        const orderedFields = [...model.fields].sort((a, b) => {
            if (a.name === 'updated_at') return 1;
            if (b.name === 'updated_at') return -1;
            return 0;
        });

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
                                    ${orderedFields.map(field =>
                                        `<th>${field.display_name}</th>`
                                    ).join('')}
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="items-table-body">
                                ${items.length === 0 ?
                                    `<tr><td colspan="${orderedFields.length + 1}" class="text-center">No ${model.display_name.toLowerCase()} found</td></tr>` :
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

                // Add data cells in the new order
                orderedFields.forEach(field => {
                    const cell = document.createElement('td');

                    if (field.name === 'id') {
                        cell.innerHTML = `<span class="badge bg-secondary">${item[field.name].substring(0, 8)}...</span>`;
                    } else if (field.type === 'datetime' || field.name === 'updated_at') {
                        // Show full date and time for datetime fields and updated_at
                        cell.textContent = item[field.name] ? formatDateTime(item[field.name]) : '-';
                    } else if (field.type === 'date') {
                        // Show only date for date fields
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

    // Add this new formatter function
    function formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    // Open modal to add new item
    function openAddItemModal() {
        const model = getModelMetadata(activeModel);

        isEditMode = false;
        itemFormModalTitle.textContent = `Add New ${model.display_name.slice(0, -1)}`;
        saveItemBtn.textContent = 'Add';

        // Build form
        buildItemForm(false);  // Pass false for create mode

        // Show modal
        itemFormModal.show();
    }

    // Initialize datepickers for date fields
    function initializeDatepickers() {
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
                    // Validate the field on change
                    validateField(input);

                    // Make sure the hidden input gets the value
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
    }

    // Build dynamic form for the active model
    function buildItemForm(isEdit = false) {
        formFieldsContainer.innerHTML = '';
        formValidators = {};

        const model = getModelMetadata(activeModel);

        model.fields.forEach(field => {
            // Skip non-editable fields and timestamp fields
            if (!field.editable) return;
            if (field.name === 'created_at' || field.name === 'updated_at') return;

            const fieldId = `item-${field.name}`;
            const fieldDiv = document.createElement('div');
            fieldDiv.className = 'mb-3';

            const label = document.createElement('label');
            label.htmlFor = fieldId;
            label.className = 'form-label';
            label.textContent = field.display_name;
            if (field.required) {
                label.innerHTML += ' <span class="text-danger">*</span>';
            }

            let input;

            if (field.type === 'enum') {
                // Create select element for enum fields
                input = document.createElement('select');
                input.className = 'form-select';
                input.id = fieldId;

                if (field.required) {
                    input.required = true;
                }

                // Add placeholder option
                const placeholderOption = document.createElement('option');
                placeholderOption.value = '';
                placeholderOption.textContent = `Select ${field.display_name}...`;
                placeholderOption.disabled = true;
                placeholderOption.selected = true;
                input.appendChild(placeholderOption);

                // Add enum options
                if (field.options && Array.isArray(field.options)) {
                    field.options.forEach(option => {
                        const optionElement = document.createElement('option');
                        optionElement.value = option.value;
                        optionElement.textContent = option.name;
                        input.appendChild(optionElement);
                    });
                }

                fieldDiv.appendChild(label);
                fieldDiv.appendChild(input);
            } else if (field.type === 'boolean') {
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

                // Setup date validation
                formValidators[field.name] = validateDate;
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

                // Setup validation
                if (field.type === 'email') {
                    formValidators[field.name] = validateEmail;
                }

                // Add input event listener for validation
                input.addEventListener('input', () => validateField(input, formValidators[field.name]));
            }

            formFieldsContainer.appendChild(fieldDiv);
        });
    }

    // Date validation function
    function validateDate(dateStr) {
        if (!dateStr) return false;

        // First, try to validate using flatpickr's format (YYYY-MM-DD)
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (regex.test(dateStr)) {
            // Check if date is valid
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return true;
            }
        }

        // Also validate the formatted display value that might be in the alt input
        return false;
    }

    // Validate a field
    function validateField(inputElement, customValidator) {
        // Reset validation state
        inputElement.classList.remove('is-invalid');

        // Skip validation for non-required empty fields
        if (!inputElement.required && !inputElement.value.trim()) {
            return true;
        }

        // Check if required field is empty
        if (inputElement.required && !inputElement.value.trim()) {
            inputElement.classList.add('is-invalid');
            return false;
        }

        // Apply custom validator if provided
        if (customValidator && !customValidator(inputElement.value)) {
            inputElement.classList.add('is-invalid');
            return false;
        }

        return true;
    }

    // Email validation
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Validate the entire form
    function validateForm() {
        let isValid = true;
        const model = getModelMetadata(activeModel);

        // Validate each editable and visible field
        model.fields.forEach(field => {
            if (!field.editable) return;

            const inputElement = document.getElementById(`item-${field.name}`);
            if (!inputElement) return;

            // Skip validation for boolean fields
            if (field.type === 'boolean') return;

            const fieldIsValid = validateField(inputElement, formValidators[field.name]);
            isValid = isValid && fieldIsValid;
        });

        return isValid;
    }

    // Handle form submission
    function handleFormSubmit() {
        // Clear previous errors
        hideFormError();

        // For models with datepickers, ensure all datepicker values are properly
        // transferred to their input fields
        datePickerInstances.forEach(picker => {
            if (picker && picker.element) {
                // Ensure the main input has the date value in YYYY-MM-DD format
                const selectedDate = picker.selectedDates[0];
                if (selectedDate) {
                    const year = selectedDate.getFullYear();
                    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                    const day = String(selectedDate.getDate()).padStart(2, '0');
                    picker.element.value = `${year}-${month}-${day}`;
                }
            }
        });

        // Client-side validation
        if (!validateForm()) {
            return;
        }

        const model = getModelMetadata(activeModel);
        const itemData = {};

        // Collect form data
        model.fields.forEach(field => {
            if (!field.editable) return;

            const inputElement = document.getElementById(`item-${field.name}`);
            if (!inputElement) return;

            if (field.type === 'boolean') {
                itemData[field.name] = inputElement.checked;
            } else if (field.type === 'date') {
                // For date fields, only include if they have a value (to handle optional dates)
                if (inputElement.value.trim()) {
                    // Make sure we're sending the ISO format YYYY-MM-DD
                    itemData[field.name] = inputElement.value;
                }
            } else {
                itemData[field.name] = inputElement.value;
            }
        });

        console.log("Submitting data:", itemData);

        const itemId = itemIdInput.value;

        if (isEditMode && itemId) {
            // Update existing item
            updateItem(itemId, itemData);
        } else {
            // Create new item
            createItem(itemData);
        }
    }

    // Create new item
    async function createItem(itemData) {
        try {
            showLoading();

            const response = await fetch(`/api/${activeModel}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(itemData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw errorData;
            }

            const newItem = await response.json();

            // Close modal
            itemFormModal.hide();

            // Reload items
            await loadItems();

            // Show success message
            showToast('Success', `${getModelDisplayName()} created successfully!`, 'success');

            hideLoading();
        } catch (error) {
            console.error(`Error creating ${getModelDisplayName()}:`, error);
            handleApiValidationErrors(error);
            hideLoading();
        }
    }

    // Update existing item
    async function updateItem(itemId, itemData) {
        try {
            showLoading();

            const response = await fetch(`/api/${activeModel}/${itemId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(itemData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw errorData;
            }

            const updatedItem = await response.json();

            // Close modal
            itemFormModal.hide();

            // Reload items
            await loadItems();

            // Show success message
            showToast('Success', `${getModelDisplayName()} updated successfully!`, 'success');

            hideLoading();
        } catch (error) {
            console.error(`Error updating ${getModelDisplayName()}:`, error);
            handleApiValidationErrors(error);
            hideLoading();
        }
    }

    // Get display name (singular) for the active model
    function getModelDisplayName() {
        const model = getModelMetadata(activeModel);
        // Remove trailing 's' to get singular form
        return model.display_name.slice(0, -1);
    }

    // Process and display API validation errors
    function handleApiValidationErrors(error) {
        // Hide the general error first
        hideFormError();

        // Check for the FastAPI validation error format (detail array)
        if (error.detail && Array.isArray(error.detail)) {
            let hasFieldErrors = false;

            // Process each validation error
            error.detail.forEach(err => {
                if (err.loc && err.loc.length >= 2) {
                    const field = err.loc[1]; // The field name is in the second position
                    const message = err.msg; // The error message

                    const inputElement = document.getElementById(`item-${field}`);
                    const errorElement = document.getElementById(`item-${field}-error`);

                    if (inputElement && errorElement) {
                        inputElement.classList.add('is-invalid');
                        errorElement.textContent = message;
                        hasFieldErrors = true;
                    }
                }
            });

            // If no specific field errors were matched, show a general error
            if (!hasFieldErrors) {
                // Create a readable error message from the first error
                if (error.detail.length > 0 && error.detail[0].msg) {
                    showFormError(error.detail[0].msg);
                } else {
                    showFormError("Validation error. Please check your input.");
                }
            }
        } else if (error.errors) {
            // Handle alternative error format if necessary
            for (const [field, message] of Object.entries(error.errors)) {
                const inputElement = document.getElementById(`item-${field}`);
                const errorElement = document.getElementById(`item-${field}-error`);

                if (inputElement && errorElement) {
                    inputElement.classList.add('is-invalid');
                    errorElement.textContent = message;
                }
            }
        } else if (error.detail && typeof error.detail === 'string') {
            // Handle a generic error with a string detail field
            showFormError(error.detail);
        } else {
            // Handle completely unexpected error format
            showFormError("An error occurred. Please try again.");
        }
    }

    // Show form error
    function showFormError(message) {
        formErrorMessage.textContent = message;
        formErrorAlert.classList.remove('d-none');
    }

    // Hide form error
    function hideFormError() {
        formErrorAlert.classList.add('d-none');

        // Reset all field validations
        const formInputs = itemForm.querySelectorAll('.form-control');
        formInputs.forEach(input => input.classList.remove('is-invalid'));
    }

    // Reset form
    function resetForm() {
        itemForm.reset();
        itemIdInput.value = '';
        hideFormError();
    }

    // Format date with time
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString();
    }

    // Format date only (without time)
    function formatDateOnly(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    // Show loading spinner
    function showLoading() {
        loadingSpinner.classList.remove('d-none');
    }

    // Hide loading spinner
    function hideLoading() {
        loadingSpinner.classList.add('d-none');
    }

    // Show toast notification
    function showToast(title, message, type = 'info') {
        toastTitle.textContent = title;
        toastMessage.textContent = message;

        // Remove existing color classes
        const toastEl = document.getElementById('toast');
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

        toast.show();
    }

    // Global function to edit an item
    window.editItem = async function(itemId) {
        try {
            showLoading();

            const response = await fetch(`/api/${activeModel}/${itemId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${getModelDisplayName()}`);
            }

            const item = await response.json();

            // Build the form
            buildItemForm(true);  // Pass true for edit mode

            // Set form values
            itemIdInput.value = item.id;

            const model = getModelMetadata(activeModel);

            // Set values for non-date fields immediately
            model.fields.forEach(field => {
                if (!field.editable || field.type === 'date') return;

                const inputElement = document.getElementById(`item-${field.name}`);
                if (!inputElement) return;

                if (field.type === 'boolean') {
                    inputElement.checked = item[field.name];
                } else {
                    inputElement.value = item[field.name];
                }
            });

            // Store date values to be set after datepickers are initialized
            const dateValues = {};
            model.fields.forEach(field => {
                if (field.editable && field.type === 'date' && item[field.name]) {
                    dateValues[`item-${field.name}`] = item[field.name];
                }
            });

            // Update UI for edit mode
            isEditMode = true;
            itemFormModalTitle.textContent = `Edit ${getModelDisplayName()}`;
            saveItemBtn.textContent = 'Update';

            // Show modal
            itemFormModal.show();

            // After modal is shown and datepickers are initialized, set date values
            itemFormModalEl.addEventListener('shown.bs.modal', function setDateValues() {
                // Wait for datepickers to initialize
                setTimeout(() => {
                    // Set values for date fields
                    for (const [fieldId, dateValue] of Object.entries(dateValues)) {
                        const datePicker = datePickerInstances.find(picker =>
                            picker.element && picker.element.id === fieldId
                        );
                        if (datePicker) {
                            datePicker.setDate(dateValue);

                            // Also make sure the input field has the value
                            const inputElement = document.getElementById(fieldId);
                            if (inputElement) {
                                inputElement.value = dateValue;
                            }
                        }
                    }
                }, 100);

                // Remove this one-time event listener
                itemFormModalEl.removeEventListener('shown.bs.modal', setDateValues);
            });

            hideLoading();
        } catch (error) {
            console.error(`Error fetching ${getModelDisplayName()}:`, error);
            showToast('Error', `Failed to load ${getModelDisplayName()} data`, 'danger');
            hideLoading();
        }
    };

    // Global function to delete an item
    window.deleteItem = function(id) {
        itemToDelete = id;
        deleteModal.show();
    };

    // Confirm delete
    async function confirmDelete() {
        if (!itemToDelete) return;

        try {
            showLoading();

            const response = await fetch(`/api/${activeModel}/${itemToDelete}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`Failed to delete ${getModelDisplayName()}`);
            }

            // Parse response
            const data = await response.json();

            // Close modal
            deleteModal.hide();

            // Reset state
            itemToDelete = null;

            // Reload items
            await loadItems();

            // Show success message
            showToast('Success', `${getModelDisplayName()} deleted successfully!`, 'success');

            hideLoading();
        } catch (error) {
            console.error(`Error deleting ${getModelDisplayName()}:`, error);
            showToast('Error', `Failed to delete ${getModelDisplayName()}`, 'danger');
            hideLoading();
        }
    }
});