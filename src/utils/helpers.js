exports.slugify = (text) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

exports.formatDate = (date) => {
    return new Date(date).toLocaleDateString('uz-UZ');
};
