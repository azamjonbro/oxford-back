const fs = require('fs');
const jwt = require('jsonwebtoken');
const FormData = require('form-data');
const axios = require('axios');

async function test() {
    const token = jwt.sign({ id: 'dummy', role: 'admin' }, 'oxford_secret_key_123');
    const form = new FormData();
    form.append('image', fs.createReadStream('package.json'));

    try {
        const res = await axios.post('http://localhost:5010/api/upload', form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });
        console.log("Success:", res.data);
    } catch (err) {
        console.error("Error:", err.response ? err.response.data : err.message);
    }
}
test();
