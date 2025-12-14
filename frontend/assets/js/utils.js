// Utility functions

// Format numbers with commas
function formatNumber(num) {
    if (num === null || num === undefined) return 'N/A';
    if (typeof num === 'string') num = parseFloat(num);
    if (isNaN(num)) return 'N/A';
    
    return num.toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

// Format currency
function formatCurrency(value, currency = 'USD') {
    if (value === null || value === undefined) return 'N/A';
    
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'N/A';
    
    if (num >= 1e9) {
        return `${currency} ${(num / 1e9).toFixed(2)}B`;
    } else if (num >= 1e6) {
        return `${currency} ${(num / 1e6).toFixed(2)}M`;
    } else if (num >= 1e3) {
        return `${currency} ${(num / 1e3).toFixed(2)}K`;
    } else {
        return `${currency} ${num.toFixed(2)}`;
    }
}

// Format percentage
function formatPercent(value) {
    if (value === null || value === undefined) return 'N/A';
    
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'N/A';
    
    return `${num.toFixed(1)}%`;
}

// Get color based on score
function getScoreColor(score) {
    if (score >= 8) return '#22c55e'; // Green
    if (score >= 5) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
}

// Get risk level
function getRiskLevel(score) {
    if (score >= 8) return 'Low';
    if (score >= 5) return 'Medium';
    return 'High';
}

// Debounce function
function debounce(func, wait) {
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

// Generate random ID
function generateId(prefix = '') {
    return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
}

// Validate email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Parse query parameters
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Set query parameter
function setQueryParam(param, value) {
    const url = new URL(window.location);
    url.searchParams.set(param, value);
    window.history.pushState({}, '', url);
}

// Remove query parameter
function removeQueryParam(param) {
    const url = new URL(window.location);
    url.searchParams.delete(param);
    window.history.pushState({}, '', url);
}

// Get readable time difference
function timeAgo(date) {
    const now = new Date();
    const past = new Date(date);
    const diff = now - past;
    
    const minute = 60 * 1000;
    const hour = minute * 60;
    const day = hour * 24;
    const week = day * 7;
    const month = day * 30;
    const year = day * 365;
    
    if (diff < minute) return 'Just now';
    if (diff < hour) return `${Math.floor(diff / minute)} minutes ago`;
    if (diff < day) return `${Math.floor(diff / hour)} hours ago`;
    if (diff < week) return `${Math.floor(diff / day)} days ago`;
    if (diff < month) return `${Math.floor(diff / week)} weeks ago`;
    if (diff < year) return `${Math.floor(diff / month)} months ago`;
    return `${Math.floor(diff / year)} years ago`;
}

// Export all functions
window.utils = {
    formatNumber,
    formatCurrency,
    formatPercent,
    getScoreColor,
    getRiskLevel,
    debounce,
    generateId,
    validateEmail,
    getQueryParam,
    setQueryParam,
    removeQueryParam,
    timeAgo
};