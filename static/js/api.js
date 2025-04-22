// static/js/api.js

/**
 * Fetch model metadata from the server
 * @returns {Promise<Array>} Model metadata
 */
export async function fetchMetadata() {
    const response = await fetch('/api/metadata');
    if (!response.ok) {
        throw new Error('Failed to fetch model metadata');
    }
    const data = await response.json();
    return data.models;
}

/**
 * Fetch enum data for all models
 * @param {Array} models Model metadata
 * @returns {Promise<Object>} Enum options
 */
export async function fetchEnumData(models) {
    const enumOptions = {};

    for (const model of models) {
        for (const field of model.fields) {
            if (field.type === 'enum' && field.enum_name) {
                try {
                    const response = await fetch(`/api/enums/${field.enum_name}`);
                    if (response.ok) {
                        const data = await response.json();
                        enumOptions[field.enum_name] = data;
                    }
                } catch (error) {
                    console.error(`Error fetching enum data for ${field.enum_name}:`, error);
                }
            }
        }
    }

    return enumOptions;
}

/**
 * Fetch items for a model
 * @param {string} modelName Model name
 * @returns {Promise<Array>} Items
 */
export async function fetchItems(modelName) {
    const response = await fetch(`/api/${modelName}/`);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${modelName}`);
    }
    return response.json();
}

/**
 * Create a new item
 * @param {string} modelName Model name
 * @param {Object} itemData Item data
 * @returns {Promise<Object>} Created item
 */
export async function createItem(modelName, itemData) {
    const response = await fetch(`/api/${modelName}/`, {
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

    return response.json();
}

/**
 * Update an existing item
 * @param {string} modelName Model name
 * @param {string} itemId Item ID
 * @param {Object} itemData Item data
 * @returns {Promise<Object>} Updated item
 */
export async function updateItem(modelName, itemId, itemData) {
    const response = await fetch(`/api/${modelName}/${itemId}`, {
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

    return response.json();
}

/**
 * Delete an item
 * @param {string} modelName Model name
 * @param {string} itemId Item ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteItem(modelName, itemId) {
    const response = await fetch(`/api/${modelName}/${itemId}`, {
        method: 'DELETE'
    });

    if (!response.ok) {
        throw new Error(`Failed to delete item`);
    }

    return response.json();
}