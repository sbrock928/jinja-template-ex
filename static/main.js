document.addEventListener('DOMContentLoaded', () => {
    const model = getModel();
    htmx.ajax('GET', `/${model}/table`, `#${model}-table`);
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

function closeModal() {
    document.getElementById('modal').innerHTML = '';
}

function submitForm(event, formElement) {
    event.preventDefault();

    const model = getModel();
    const formData = new FormData(formElement);
    const url = formElement.getAttribute('action');
    let method = formElement.getAttribute('method')?.toUpperCase() || 'POST';
    const override = formElement.querySelector('input[name="_method"]');
    if (override) {
        method = override.value.toUpperCase();
    }

    fetch(url, {
        method,
        body: formData,
    }).then(async (res) => {
        if (res.ok) {
            closeModal();
            htmx.ajax('GET', `/${model}/table`, `#${model}-table`);
        } else if (res.status === 422) {
            const data = await res.json();

            const errorMap = {};
            for (const err of data.detail) {
                const field = err.loc[err.loc.length - 1];
                if (!errorMap[field]) errorMap[field] = [];
                errorMap[field].push(err.msg);
            }

            formElement.querySelectorAll('.error-msg').forEach(el => el.remove());
            formElement.querySelectorAll('input').forEach(el => el.classList.remove('error'));

            for (const [field, messages] of Object.entries(errorMap)) {
                const input = formElement.querySelector(`[name="${field}"]`);
                if (input) {
                    input.classList.add('error');
                    const msgEl = document.createElement('p');
                    msgEl.className = 'error-msg';
                    msgEl.innerText = messages.join(', ');
                    input.insertAdjacentElement('afterend', msgEl);
                }
            }
        } else {
            alert('Unexpected error occurred');
        }
    });
}

function deleteRecord(id) {
    const model = getModel();
    if (!confirm(`Are you sure you want to delete this ${model}?`)) return;

    fetch(`/api/${model}/${id}`, {
        method: 'DELETE',
    }).then(res => {
        if (res.ok) {
            htmx.ajax('GET', `/${model}/table`, `#${model}-table`);
        } else {
            alert(`Failed to delete ${model}`);
        }
    });
}
