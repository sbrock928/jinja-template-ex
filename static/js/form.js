// static/js/form.js

/**
 * Initialize form event handlers
 * @param {Function} submitCallback Form submission callback
 * @param {Function} resetCallback Form reset callback
 */
export function initFormEventHandlers(submitCallback, resetCallback) {
    // Save button
    document.getElementById('save-item-btn').addEventListener('click', submitCallback);

    // Reset form when modal is closed
    document.getElementById('itemFormModal').addEventListener('hidden.bs.modal', resetCallback);

    // Setup form field validation
    setupFieldValidation();
}

/**
 * Setup field validation event listeners
 */
function setupFieldValidation() {
    // Add validation on input for all form fields
    document.addEventListener('input', function(event) {
        const target = event.target;

        // Only validate form controls
        if (target.matches('.form-control, .form-select')) {
            validateField(target);
        }
    });

    // Add validation on change for select fields
    document.addEventListener('change', function(event) {
        const target = event.target;

        // Only validate select controls
        if (target.matches('.form-select')) {
            validateField(target);
        }
    });
}

/**
 * Validate a form field
 * @param {HTMLElement} inputElement Form field element
 * @param {Function} customValidator Custom validator function
 * @returns {boolean} Validation result
 */
export function validateField(inputElement, customValidator) {
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

/**
 * Validate the entire form
 * @param {Object} model Model metadata
 * @returns {Object|null} Form data if valid, null if invalid
 */
export function validateForm(model) {
    // Clear previous errors
    hideFormErrors();

    // Prepare form data
    const formData = {};
    let isValid = true;

    // Synchronize datepicker values with inputs
    synchronizeDatepickerValues();

    // Validate each field and collect form data
    model.fields.forEach(field => {
        if (!field.editable) return;

        const inputElement = document.getElementById(`item-${field.name}`);
        if (!inputElement) return;

        // Skip validation for boolean fields
        if (field.type === 'boolean') {
            formData[field.name] = inputElement.checked;
            return;
        }

        // Validate field
        const customValidator = getValidatorForField(field);
        const fieldIsValid = validateField(inputElement, customValidator);

        // Update form validity
        isValid = isValid && fieldIsValid;

        // Add field value to form data
        if (field.type === 'date') {
            // For date fields, only include if they have a value (to handle optional dates)
            if (inputElement.value.trim()) {
                formData[field.name] = inputElement.value;
            }
        } else {
            formData[field.name] = inputElement.value;
        }
    });

    return isValid ? formData : null;
}

/**
 * Synchronize datepicker values with input fields
 */
function synchronizeDatepickerValues() {
    if (window.flatpickr) {
        // Get all datepicker instances from the global scope
        const instances = document.querySelectorAll('input[data-type="date"]');

        instances.forEach(input => {
            const fpInstance = input._flatpickr;
            if (fpInstance && fpInstance.selectedDates.length > 0) {
                const selectedDate = fpInstance.selectedDates[0];
                const year = selectedDate.getFullYear();
                const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                const day = String(selectedDate.getDate()).padStart(2, '0');
                input.value = `${year}-${month}-${day}`;
            }
        });
    }
}

/**
 * Get a validator function for a field
 * @param {Object} field Field metadata
 * @returns {Function|null} Validator function
 */
function getValidatorForField(field) {
    if (field.type === 'email') {
        return validateEmail;
    } else if (field.type === 'date') {
        return validateDate;
    }

    return null;
}

/**
 * Validate an email address
 * @param {string} email Email address
 * @returns {boolean} Validation result
 */
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Validate a date string
 * @param {string} dateStr Date string
 * @returns {boolean} Validation result
 */
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

    return false;
}

/**
 * Hide form errors
 */
export function hideFormErrors() {
    // Hide general error alert
    document.getElementById('form-error-alert').classList.add('d-none');

    // Reset all field validations
    const formInputs = document.querySelectorAll('.form-control, .form-select');
    formInputs.forEach(input => input.classList.remove('is-invalid'));
}

/**
 * Display API validation errors
 * @param {Object} error API error
 */
export function displayValidationErrors(error) {
    // Hide existing errors
    hideFormErrors();

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

/**
 * Show general form error
 * @param {string} message Error message
 */
function showFormError(message) {
    const formErrorAlert = document.getElementById('form-error-alert');
    const formErrorMessage = document.getElementById('form-error-message');

    formErrorMessage.textContent = message;
    formErrorAlert.classList.remove('d-none');
}