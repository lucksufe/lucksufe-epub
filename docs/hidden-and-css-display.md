# HTML hidden 属性与 CSS display 的冲突

## 问题

HTML 的 `hidden` 属性本意是隐藏元素：

```html
<div hidden>你看不到我</div>
```

浏览器默认给 `hidden` 元素加 `display: none`。但如果你在 CSS 里写了 `display`，它会**覆盖** `hidden` 的效果：

```css
.my-element {
  display: flex;  /* 这行会打败 hidden 属性 */
}
```

```html
<div class="my-element" hidden>我其实还是可见的！</div>
```

## 原因

CSS 的优先级规则：**CSS 声明 > 浏览器默认样式**。

`hidden` 属性触发的 `display: none` 属于浏览器默认样式（User Agent Stylesheet），优先级最低。你在 CSS 里写的 `display: flex` 会直接覆盖它。

```
优先级从低到高：
1. 浏览器默认样式（hidden 属性在这里）
2. 用户样式表
3. 作者样式表（你写的 CSS 在这里）
4. !important
```

## 解决方案

### 方案一：`:not([hidden])` 选择器（推荐）

```css
/* 默认不显示 */
.my-element {
  display: none;
}

/* 只有没 hidden 属性时才显示 */
.my-element:not([hidden]) {
  display: flex;
}
```

```html
<div class="my-element" hidden>隐藏 ✓</div>
<div class="my-element">显示为 flex ✓</div>
```

### 方案二：用 visibility 替代

```css
.my-element {
  display: flex;
  visibility: hidden;  /* 占位但不可见 */
}

.my-element[hidden] {
  display: none;  /* 完全不占位 */
}
```

### 方案三：JS 控制类名

不用 `hidden` 属性，改用 CSS 类名控制：

```css
.my-element {
  display: flex;
}

.my-element.is-hidden {
  display: none;
}
```

```js
element.classList.add('is-hidden');
element.classList.remove('is-hidden');
```

## 容易踩坑的场景

| 场景 | 踩坑 | 修复 |
|------|------|------|
| `display: flex` + `hidden` | flex 覆盖 hidden | `:not([hidden])` |
| `display: grid` + `hidden` | 同上 | `:not([hidden])` |
| `display: block` + `hidden` | 同上 | `:not([hidden])` |
| `display: inline-flex` + `hidden` | 同上 | `:not([hidden])` |

**规律**：只要 CSS 里写了 `display` 的任何值，`hidden` 属性就会失效。

## 本项目中遇到的案例

### 高亮弹窗 (reader.css)

```css
/* 修复前：弹窗始终可见 */
.highlight-popup {
  display: flex;  /* 覆盖了 hidden */
}

/* 修复后 */
.highlight-popup {
  display: none;
}
.highlight-popup:not([hidden]) {
  display: flex;
}
```

### 空状态提示 (library.css)

```css
/* 修复前：添加书籍后提示仍然显示 */
.empty-state {
  display: flex;  /* 覆盖了 hidden */
}

/* 修复后 */
.empty-state {
  display: none;
}
.empty-state:not([hidden]) {
  display: flex;
}
```

## 记忆口诀

> **写了 display，hidden 就失灵。**
> **要用 `:not([hidden])`，才能两边行。**
