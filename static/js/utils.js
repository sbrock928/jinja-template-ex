// static/js/utils.js

/**
 * Format date with time
 * @param {string} dateString Date string
 * @returns {string} Formatted date string
 */
export function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

/**
 * Format date only (without time)
 * @param {string} dateString Date string
 * @returns {string} Formatted date string
 */
export function formatDateOnly(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
export function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Deep clone an object
 * @param {Object} obj Object to clone
 * @returns {Object} Cloned object
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Debounce a function
 * @param {Function} func Function to debounce
 * @param {number} wait Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;

    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Get singular form of a word
 * @param {string} word Word to singularize
 * @returns {string} Singular form
 */
export function singularize(word) {
    if (word.endsWith('ies')) {
        return word.slice(0, -3) + 'y';
    } else if (word.endsWith('s')) {
        return word.slice(0, -1);
    }
    return word;
}

/**
 * Convert camelCase to Title Case
 * @param {string} camelCase camelCase string
 * @returns {string} Title Case string
 */
export function camelToTitleCase(camelCase) {
    const result = camelCase.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Check if object is empty
 * @param {Object} obj Object to check
 * @returns {boolean} True if empty
 */
export function isEmptyObject(obj) {
    return Object.keys(obj).length === 0;
}

/**
 * Get query parameter from URL
 * @param {string} name Parameter name
 * @returns {string|null} Parameter value
 */
export function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

/**
 * Safely parse JSON
 * @param {string} jsonString JSON string
 * @param {*} defaultValue Default value if parsing fails
 * @returns {*} Parsed JSON or default value
 */
export function safeJsonParse(jsonString, defaultValue = null) {
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        return defaultValue;
    }
}