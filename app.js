const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// 使用 session 来保存用户的 API key 和选择状态
app.use(session({
    secret: 'mbti_secret',
    resave: false,
    saveUninitialized: true,
}));

// 根路由
app.get('/', (req, res) => {
    res.redirect('/settings'); // 将根路由重定向到设置页面
});

// 设置页面路由
app.get('/settings', (req, res) => {
    res.render('settings', { useDefault: req.session.useDefault || false, apiKey: req.session.apiKey || '' });
});

// 处理设置表单的 POST 请求
app.post('/settings', (req, res) => {
    const { useDefault, apiKey } = req.body;

    // 保存到 session 中
    req.session.useDefault = useDefault === 'on'; // checkbox 返回值 'on'
    req.session.apiKey = apiKey || null; // 如果没有输入 API key，设为 null

    // 重定向到测试页面
    res.redirect('/mbti-test');
});
// MBTI 测试页面路由
app.get('/mbti-test', async (req, res) => {
    let questions = [];
    const errors = []; // Initialize errors array

    // 如果用户选择了使用默认问题
    if (req.session.useDefault) {
        questions = getQuestionsFromTxt();
    } else if (req.session.apiKey) {
        // 否则通过 API key 调用 AI 大模型生成问题
        questions = await generateQuestionsFromAPI(req.session.apiKey);
    } else {
        errors.push({ msg: 'No questions could be generated. Please check your settings.' });
    }

    res.render('index', { questions, errors }); // Pass errors to the view
});



// 假设这个函数从 AI API 生成问题
async function generateQuestionsFromAPI(apiKey) {
    const apiUrl = `https://api.openai.com/v1/generateQuestions`; // 示例 URL
    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
    };
    const data = {
        prompt: "Generate MBTI test questions",
        max_tokens: 50,
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
    });

    const result = await response.json();
    return result.questions || ["API failed to return questions."]; // 处理 API 错误
}

// 输入 API 密钥的页面
app.get('/input-api', (req, res) => {
    res.render('input-api'); // 渲染输入 API 密钥的页面
});

// 处理 API 密钥提交
app.post('/submit-api-key', (req, res) => {
    const apiKey = req.body['api-key'];
    req.session.apiKey = apiKey || null; // 保存 API 密钥

    // 根据 API 密钥生成问题或使用默认问题
    res.redirect('/mbti-test'); // 直接重定向到测试页面
});

// 从txt文件中随机读取问题
function getQuestionsFromTxt() {
    const filePath = './questions.txt';
    const allQuestions = fs.readFileSync(filePath, 'utf8').split('\n').filter(line => line.trim() !== '');
    const randomQuestions = [];

    // 随机选择3个问题
    while (randomQuestions.length < 3) {
        const randomIndex = Math.floor(Math.random() * allQuestions.length);
        if (!randomQuestions.includes(allQuestions[randomIndex])) {
            randomQuestions.push(allQuestions[randomIndex]);
        }
    }

    return randomQuestions.map(q => {
        const [english, chinese] = q.split('. ');
        return { english, chinese };
    });
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
