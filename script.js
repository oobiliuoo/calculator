/**
 * 计算器应用脚本
 * 实现基本算术运算和历史记录功能
 */

// ==================== 常量定义 ====================
const STORAGE_KEY = 'calculator_history';
const MAX_HISTORY_ITEMS = 100;
const MAX_DISPLAY_ITEMS = 5; // 主显示屏最多显示的记录数

// ==================== DOM 元素 ====================
const displayExpression = document.getElementById('displayExpression');
const displayResult = document.getElementById('displayResult');
const displayPreview = document.getElementById('displayPreview');
const historySection = document.getElementById('historySection');
const historyListMini = document.getElementById('historyListMini');
const btnHistoryToggle = document.getElementById('btnHistoryToggle');
const historyModal = document.getElementById('historyModal');
const historyModalList = document.getElementById('historyModalList');
const btnModalClose = document.getElementById('btnModalClose');
const btnClearHistory = document.getElementById('btnClearHistory');
const modalOverlay = document.getElementById('modalOverlay');

// ==================== 状态变量 ====================
let currentInput = '';
let expression = '';
let history = [];

// ==================== 计算引擎（纯函数） ====================

/**
 * 安全地计算数学表达式
 * @param {string} expr - 数学表达式字符串
 * @returns {string} 计算结果或错误信息
 */
function evaluateExpression(expr) {
    // 移除所有空白字符
    let sanitized = expr.replace(/\s+/g, '');
    
    // 检查是否为空
    if (!sanitized) {
        return '0';
    }
    
    // 替换显示符号为计算符号
    sanitized = sanitized.replace(/×/g, '*').replace(/÷/g, '/');
    
    // 验证只包含有效字符
    const validChars = /^[0-9+\-*/.()]+$/;
    if (!validChars.test(sanitized)) {
        return 'Error';
    }
    
    try {
        // 使用 Function 构造函数进行计算（安全性已通过白名单验证）
        const result = new Function('return ' + sanitized)();
        
        // 处理结果
        if (!isFinite(result)) {
            return 'Error';
        }
        
        // 格式化结果：如果是整数则不显示小数点，否则保留合理精度
        if (Number.isInteger(result)) {
            return result.toString();
        } else {
            // 保留最多10位小数，去除尾部多余的0
            return parseFloat(result.toFixed(10)).toString();
        }
    } catch (e) {
        return 'Error';
    }
}

// ==================== 历史记录管理 ====================

/**
 * 从 LocalStorage 加载历史记录
 */
function loadHistory() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            history = JSON.parse(stored);
        }
    } catch (e) {
        console.error('加载历史记录失败:', e);
        history = [];
    }
}

/**
 * 保存历史记录到 LocalStorage
 */
function saveHistory() {
    try {
        // 限制历史记录数量
        if (history.length > MAX_HISTORY_ITEMS) {
            history = history.slice(0, MAX_HISTORY_ITEMS);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
        console.error('保存历史记录失败:', e);
    }
}

/**
 * 添加历史记录
 * @param {string} expr - 表达式
 * @param {string} result - 结果
 */
function addHistory(expr, result) {
    // 避免重复记录
    const lastItem = history[0];
    if (lastItem && lastItem.expression === expr && lastItem.result === result) {
        return;
    }
    
    history.unshift({
        expression: expr,
        result: result,
        timestamp: Date.now()
    });
    
    saveHistory();
    renderHistoryMini();
    renderHistoryModal();
}

/**
 * 清空历史记录
 */
function clearAllHistory() {
    history = [];
    saveHistory();
    renderHistoryMini();
    renderHistoryModal();
}

/**
 * 渲染最近5条历史记录（主显示屏）
 */
function renderHistoryMini() {
    if (history.length === 0) {
        historyListMini.innerHTML = '<div class="history-empty-mini">暂无计算记录</div>';
        return;
    }
    
    // 只显示最近5条
    const recentHistory = history.slice(0, MAX_DISPLAY_ITEMS);
    
    historyListMini.innerHTML = recentHistory.map((item, index) => `
        <div class="history-item-mini" data-index="${index}">
            <span class="expr">${item.expression}</span>
            <span class="result">= ${item.result}</span>
        </div>
    `).join('');
    
    // 为每个历史项添加点击事件
    document.querySelectorAll('.history-item-mini').forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.index);
            loadFromHistory(index);
        });
    });
}

/**
 * 删除单条历史记录
 * @param {number} index - 历史记录索引
 */
function deleteHistoryItem(index) {
    history.splice(index, 1);
    saveHistory();
    renderHistoryMini();
    renderHistoryModal();
}

/**
 * 渲染完整历史记录（弹窗）
 */
function renderHistoryModal() {
    if (history.length === 0) {
        historyModalList.innerHTML = '<div class="history-modal-empty">暂无计算记录</div>';
        return;
    }
    
    historyModalList.innerHTML = history.map((item, index) => `
        <div class="history-modal-item" data-index="${index}">
            <button class="btn-delete-history" data-index="${index}" title="删除">✕</button>
            <div class="expr">${item.expression}</div>
            <div class="result">= ${item.result}</div>
        </div>
    `).join('');
    
    // 为每个历史项添加点击事件（加载表达式）
    document.querySelectorAll('.history-modal-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // 如果点击的是删除按钮，不加载表达式
            if (e.target.classList.contains('btn-delete-history')) {
                return;
            }
            const index = parseInt(item.dataset.index);
            loadFromHistory(index);
            closeHistoryModal();
        });
    });
    
    // 为每个删除按钮添加点击事件
    document.querySelectorAll('.btn-delete-history').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止冒泡，防止触发item点击
            const index = parseInt(btn.dataset.index);
            deleteHistoryItem(index);
        });
    });
}

/**
 * 从历史记录加载表达式
 * @param {number} index - 历史记录索引
 */
function loadFromHistory(index) {
    const item = history[index];
    if (item) {
        expression = item.expression;
        currentInput = '';
        updateDisplay();
    }
}

// ==================== 弹窗管理 ====================

/**
 * 打开历史记录弹窗
 */
function openHistoryModal() {
    historyModal.classList.add('active');
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // 防止背景滚动
}

/**
 * 关闭历史记录弹窗
 */
function closeHistoryModal() {
    historyModal.classList.remove('active');
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ==================== UI 更新 ====================

/**
 * 将表达式渲染为可点击的HTML
 * @param {string} expr - 原始表达式
 * @returns {string} HTML字符串
 */
function renderExpressionHTML(expr) {
    if (!expr) return '';
    
    // 替换显示符号并分割为 tokens
    const displayExpr = expr.replace(/\*/g, '×').replace(/\//g, '÷');
    
    // 使用正则分割表达式为数字和运算符
    const tokens = displayExpr.split(/([+\-×÷()])/g).filter(t => t);
    
    let html = '';
    tokens.forEach((token, index) => {
        if (['+', '-', '×', '÷'].includes(token)) {
            // 运算符 - 可点击切换
            html += `<span class="expression-operator" data-index="${index}" data-op="${token}" title="点击修改运算符">${token}</span>`;
        } else if (/^\d+(\.\d+)?$/.test(token)) {
            // 数字 - 可点击编辑
            html += `<span class="expression-number" data-index="${index}" data-value="${token}" title="点击重新编辑">${token}</span>`;
        } else {
            // 括号等其他字符
            html += `<span class="expression-number">${token}</span>`;
        }
    });
    
    return html;
}

/**
 * 更新显示屏
 */
function updateDisplay() {
    // 渲染表达式（运算符和数字都可点击）
    const expressionHTML = renderExpressionHTML(expression);
    const expressionText = document.getElementById('expressionText');
    if (expressionText) {
        expressionText.innerHTML = expressionHTML;
        
        // 为运算符添加点击事件
        document.querySelectorAll('.expression-operator').forEach(el => {
            el.addEventListener('click', (e) => {
                const op = e.target.dataset.op;
                handleOperatorClick(op, parseInt(e.target.dataset.index));
            });
        });
        
        // 为数字添加点击事件
        document.querySelectorAll('.expression-number[data-value]').forEach(el => {
            el.addEventListener('click', (e) => {
                const value = e.target.dataset.value;
                const index = parseInt(e.target.dataset.index);
                handleNumberClick(value, index);
            });
        });
    }
    
    // 兼容旧版本
    displayExpression.textContent = expression.replace(/\*/g, '×').replace(/\//g, '÷');
    
    // 计算实时预览结果
    let previewResult = '';
    
    if (currentInput && /^\d+(\.\d+)?$/.test(currentInput)) {
        // 情况1: 当前正在输入有效的数字
        const fullExpression = expression + currentInput;
        const result = evaluateExpression(fullExpression);
        if (result !== 'Error' && result !== currentInput) {
            previewResult = '= ' + result;
        }
    } else if (!currentInput && expression) {
        // 情况2: 刚输入完运算符（如 12+3+），expression 完整
        // 检查表达式是否完整（以运算符结尾表示完整）
        const lastChar = expression.slice(-1);
        if (['+', '-', '*', '/'].includes(lastChar)) {
            // 去掉末尾的运算符，得到完整的表达式
            const completeExpr = expression.slice(0, -1);
            if (completeExpr) {
                const result = evaluateExpression(completeExpr);
                if (result !== 'Error') {
                    previewResult = '= ' + result;
                }
            }
        }
    }
    
    displayPreview.textContent = previewResult;
    
    // 显示当前输入
    displayResult.textContent = currentInput || '0';
}

/**
 * 处理点击表达式中的数字
 * 点击数字后，该数字会被加载到当前输入区，可重新编辑
 * @param {string} value - 被点击的数字
 * @param {number} index - 数字在tokens中的索引
 */
function handleNumberClick(value, index) {
    // 如果当前有未确认的输入，先合并到表达式
    if (currentInput) {
        expression += currentInput;
    }
    
    // 找到并删除表达式中对应的数字
    // 使用正则表达式匹配并替换
    const regex = new RegExp('^([+\-*/]*)(' + value.replace('.', '\\.') + ')([+\-*/]*)$');
    const match = expression.match(regex);
    
    if (match) {
        // 保留运算符部分
        expression = (match[1] || '') + (match[3] || '');
    }
    
    // 清除开头可能存在的多余运算符
    expression = expression.replace(/^[+\-*/]+/, '');
    
    // 设置当前输入为被点击的数字
    currentInput = value;
    updateDisplay();
}

/**
 * 处理点击表达式中的运算符
 * 点击运算符会循环切换：+ → - → × → ÷ → +
 * @param {string} oldOp - 被点击的运算符
 * @param {number} index - 运算符在tokens中的索引
 */
function handleOperatorClick(oldOp, index) {
    // 运算符循环切换顺序
    const opCycle = ['+', '-', '×', '÷'];
    const opCalcMap = { '×': '*', '÷': '/', '+': '+', '-': '-' };
    const calcOpMap = { '*': '×', '/': '÷', '+': '+', '-': '-' };
    
    // 找到当前运算符在循环中的位置
    const currentIndex = opCycle.indexOf(oldOp);
    if (currentIndex === -1) return;
    
    // 切换到下一个运算符
    const newOp = opCycle[(currentIndex + 1) % opCycle.length];
    
    // 在表达式中替换运算符
    // 需要找到对应计算符号的位置
    const oldCalcOp = opCalcMap[oldOp];
    const newCalcOp = opCalcMap[newOp];
    
    // 找到第index个运算符并替换
    let opCount = 0;
    let newExpr = '';
    
    for (let i = 0; i < expression.length; i++) {
        const char = expression[i];
        if (['+', '-', '*', '/'].includes(char)) {
            if (opCount === index) {
                // 替换运算符
                newExpr += newCalcOp;
                opCount++;
                continue;
            }
            opCount++;
        }
        newExpr += char;
    }
    
    expression = newExpr;
    updateDisplay();
}

// ==================== 事件处理 ====================

/**
 * 处理数字输入
 * @param {string} digit - 数字字符
 */
function handleNumber(digit) {
    // 限制输入长度
    if (currentInput.length >= 16) {
        return;
    }
    
    // 处理小数点
    if (digit === '.') {
        // 如果已经有小数点，则不添加
        if (currentInput.includes('.')) {
            return;
        }
        // 如果当前为空，则添加 0.
        if (!currentInput) {
            currentInput = '0.';
            updateDisplay();
            return;
        }
    }
    
    // 处理 0 的特殊情况：避免出现 00 这样的输入
    if (digit === '0' && currentInput === '0') {
        return;
    }
    
    // 如果当前是 0 且输入的不是小数点，则替换
    if (currentInput === '0' && digit !== '.') {
        currentInput = digit;
    } else {
        currentInput += digit;
    }
    
    updateDisplay();
}

/**
 * 处理操作符输入
 * @param {string} operator - 操作符（显示符号）
 */
function handleOperator(operator) {
    // 将显示符号转换为计算符号
    const opMap = { '×': '*', '÷': '/', '+': '+', '-': '-' };
    const calcOperator = opMap[operator] || operator;
    
    // 如果有当前输入，先添加到表达式
    if (currentInput) {
        expression += currentInput;
        currentInput = '';
    } else if (!expression) {
        // 如果表达式为空且没有当前输入，不处理
        return;
    }
    
    // 添加操作符（使用计算符号存储）
    expression += calcOperator;
    updateDisplay();
}

/**
 * 处理等号（计算结果）
 */
function handleEquals() {
    // 如果有当前输入，添加到表达式
    if (currentInput) {
        expression += currentInput;
        currentInput = '';
    }
    
    // 如果表达式为空，显示 0
    if (!expression) {
        displayResult.textContent = '0';
        return;
    }
    
    // 计算结果
    const result = evaluateExpression(expression);
    
    // 显示结果
    displayExpression.textContent = expression.replace(/\*/g, '×').replace(/\//g, '÷');
    displayResult.textContent = result;
    
    // 保存到历史记录
    if (result !== 'Error') {
        addHistory(
            expression.replace(/\*/g, '×').replace(/\//g, '÷'),
            result
        );
    }
    
    // 重置表达式和输入
    expression = '';
    currentInput = result !== 'Error' ? result : '';
}

/**
 * 处理清除（CE）
 */
function handleClear() {
    currentInput = '';
    expression = '';
    updateDisplay();
}

/**
 * 处理退格（⌫）
 * 优先删除当前输入区的内容，如果当前输入为空，则删除表达式区的最后一个字符
 * 如果删除的是运算符，运算符后面的数字会自动移到当前输入区
 */
function handleBackspace() {
    // 如果当前输入区有内容，删除当前输入的最后一个字符
    if (currentInput) {
        currentInput = currentInput.slice(0, -1);
        updateDisplay();
    } 
    // 如果当前输入区为空，但表达式区有内容
    else if (expression) {
        const lastChar = expression.slice(-1);
        
        if (['+', '-', '*', '/'].includes(lastChar)) {
            // 删除的是运算符，运算符后面的数字（如果有）应该移到 currentInput
            // 但实际上运算符后面应该没有数字了，因为输入时会先放到 currentInput
            expression = expression.slice(0, -1);
        } else {
            // 删除的是数字
            // 检查前面是否还有运算符
            const remaining = expression.slice(0, -1);
            const lastOpMatch = remaining.match(/[+\-*/]+$/);
            
            if (lastOpMatch) {
                // 前面有运算符，把运算符后面的数字移到 currentInput
                const lastOpIndex = remaining.lastIndexOf(lastOpMatch[0]);
                const numPart = remaining.substring(lastOpIndex + 1) + lastChar;
                currentInput = numPart;
                expression = remaining.substring(0, lastOpIndex + 1);
            } else {
                // 前面没有运算符，整个就是数字
                currentInput = remaining + lastChar;
                expression = '';
            }
        }
        updateDisplay();
    }
}

/**
 * 处理百分比
 */
function handlePercent() {
    if (currentInput) {
        try {
            const num = parseFloat(currentInput);
            if (!isNaN(num)) {
                currentInput = (num / 100).toString();
                updateDisplay();
            }
        } catch (e) {
            // 忽略错误
        }
    }
}

// ==================== 事件绑定 ====================

/**
 * 初始化事件监听器
 */
function initEventListeners() {
    // 数字按钮
    document.querySelectorAll('.btn.number').forEach(btn => {
        btn.addEventListener('click', () => {
            handleNumber(btn.dataset.value);
        });
    });
    
    // 操作符按钮
    document.querySelectorAll('.btn.operator').forEach(btn => {
        btn.addEventListener('click', () => {
            handleOperator(btn.dataset.operator);
        });
    });
    
    // 等号按钮
    document.querySelector('.btn.equals').addEventListener('click', handleEquals);
    
    // 清除按钮
    document.querySelector('[data-action="clear"]').addEventListener('click', handleClear);
    
    // 退格按钮
    document.querySelector('[data-action="backspace"]').addEventListener('click', handleBackspace);
    
    // 百分比按钮
    document.querySelector('[data-action="percent"]').addEventListener('click', handlePercent);
    
    // 历史记录按钮
    btnHistoryToggle.addEventListener('click', openHistoryModal);
    btnModalClose.addEventListener('click', closeHistoryModal);
    modalOverlay.addEventListener('click', closeHistoryModal);
    btnClearHistory.addEventListener('click', clearAllHistory);
    
    // 键盘支持
    document.addEventListener('keydown', handleKeyboard);
}

/**
 * 处理键盘输入
 * @param {KeyboardEvent} e - 键盘事件
 */
function handleKeyboard(e) {
    // 如果弹窗打开，按ESC关闭
    if (historyModal.classList.contains('active')) {
        if (e.key === 'Escape') {
            closeHistoryModal();
            return;
        }
        return; // 弹窗打开时不处理其他按键
    }
    
    const key = e.key;
    
    // 数字
    if (/^[0-9]$/.test(key)) {
        handleNumber(key);
    }
    // 小数点
    else if (key === '.') {
        handleNumber('.');
    }
    // 操作符
    else if (key === '+' || key === '-') {
        handleOperator(key);
    }
    else if (key === '*') {
        handleOperator('×');
    }
    else if (key === '/') {
        e.preventDefault(); // 防止快速搜索
        handleOperator('÷');
    }
    // 等号
    else if (key === 'Enter' || key === '=') {
        handleEquals();
    }
    // 退格
    else if (key === 'Backspace') {
        handleBackspace();
    }
    // 清除
    else if (key === 'Escape') {
        handleClear();
    }
    // 百分比
    else if (key === '%') {
        handlePercent();
    }
}

// ==================== 初始化 ====================

/**
 * 初始化应用
 */
function init() {
    loadHistory();
    renderHistoryMini();
    renderHistoryModal();
    initEventListeners();
    updateDisplay();
}

// 启动应用
document.addEventListener('DOMContentLoaded', init);
