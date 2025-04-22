document.addEventListener('DOMContentLoaded', () => {
    const model = getModel();
    if (model) {
        htmx.ajax('GET', `/${model}/table`, `#${model}-table`);
    }
});

function getModel() {
    return document.body.dataset.model;
}

function openAddModal() {
    const model = getModel();
    htmx.ajax('GET', `/${model}/modal`, '#modal');
}

function openEditModal(id) {
    const model = getModel();
    htmx.ajax('GET', `/${model}/modal/${id}`, '#modal');
}

// Function to close the modal
function closeModal() {
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.remove();
    }
}

function submitForm(event, formElement) {
    event.preventDefault();

    const formData = new FormData(formElement);
    const url = formElement.getAttribute('action');
    const methodOverride = formElement.querySelector('input[name="_method"]');
    const method = methodOverride ? methodOverride.value : 'POST';

    formData.delete('_method');
    formData.delete('_model');

    fetch(url, {
        method: method,
        body: formData,
        headers: {
            'Accept': 'application/json'
        }
    }).then(async (res) => {
        const data = await res.json();
        console.log('Response:', data); // Debug log
        
        if (res.ok) {
            closeModal();
            const model = formElement.querySelector('input[name="_model"]').value;
            htmx.ajax('GET', `/${model}/table`, `#${model}-table`);
        } else if (res.status === 422) {
            console.log('Validation errors:', data); // Debug log
            clearValidationErrors(formElement);
            if (data.errors) {
                // Handle validation errors from Pydantic
                showValidationErrors(formElement, data.errors);
            } else if (data.detail) {
                // Handle other API errors
                alert(data.detail);
            }
        } else {
            console.error('Error:', res.status, res.statusText, data);
            const errorMessage = data.detail || 'An unexpected error occurred. Please try again.';
            alert(errorMessage);
        }
    }).catch((error) => {
        console.error('Error submitting form:', error);
        alert('An error occurred while submitting the form.');
    });
}

function clearValidationErrors(formElement) {
    // Clear existing error messages and styling
    formElement.querySelectorAll('.error-msg').forEach(el => {
        el.textContent = '';
        el.classList.remove('visible');
    });
    
    formElement.querySelectorAll('input').forEach(el => {
        el.classList.remove('error');
    });
}

function showValidationErrors(formElement, errors) {
    if (!Array.isArray(errors)) {
        console.error('Expected errors to be an array:', errors);
        return;
    }

    errors.forEach(error => {
        // Get the field name from the error location
        const fieldName = error.loc[0];
        
        // Find the error message container
        const errorContainer = formElement.querySelector(`#${fieldName}-error`);
        if (errorContainer) {
            errorContainer.textContent = error.msg;
            errorContainer.classList.add('visible');
            
            // Add error class to the input
            const input = formElement.querySelector(`[name="${fieldName}"]`);
            if (input) {
                input.classList.add('error');
            }
        } else {
            console.warn(`No error container found for field: ${fieldName}`);
        }
    });
}

function deleteRecord(id) {
    const model = getModel();
    const modelTitle = document.querySelector('h2').textContent.trim(); // Changed from h1 to h2 since that's what's in your template
    
    if (!confirm(`Are you sure you want to delete this ${modelTitle.slice(0, -1)}?`)) return;

    fetch(`/api/${model}/${id}`, {
        method: 'DELETE',
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(async (res) => {
        const data = await res.json();
        
        if (res.ok) {
            // Refresh the table after successful deletion
            htmx.ajax('GET', `/${model}/table`, `#${model}-table`);
        } else {
            // Handle error response
            const errorMessage = data.detail || 'Failed to delete record';
            console.error('Delete error:', errorMessage);
            alert(errorMessage);
        }
    })
    .catch((error) => {
        console.error('Error deleting record:', error);
        alert('An error occurred while trying to delete the record.');
    });
}