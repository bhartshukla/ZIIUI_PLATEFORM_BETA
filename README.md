# text_animation_bundle


# Text Effects Lab

A lightweight, interactive **Text Effects Lab** for experimenting with modern text animations and generating ready-to-use HTML, CSS, and JavaScript code.

Choose an effect, customize the available options, enter your own text, preview the animation instantly, and copy the generated code.

## ✨ Features

* 🎨 Multiple text animation effects
* ⚡ Live preview
* 📝 Custom text input
* 🔤 Character, word, and line-based splitting
* 🎛️ Multiple animation presets
* 🔄 Replay animation
* 📋 Copy generated HTML/CSS/JavaScript
* 😀 Unicode and emoji-friendly text handling
* 📱 Responsive layout
* ♿ Reduced-motion support
* 🔒 Sandboxed iframe preview
* 🚀 No external JavaScript libraries required
* 💻 Works as a standalone HTML project

## 🎭 Available Effects

The project currently includes:

| Effect                    | Description                                                  |
| ------------------------- | ------------------------------------------------------------ |
| **Text Effect**           | Split text by character, word, or line and animate each part |
| **Custom Variants**       | Random spring, rotation, and color animation                 |
| **Text Roll**             | Letters roll upward sequentially                             |
| **Text Roll (custom)**    | Custom rolling animation with different easing               |
| **Text Scramble**         | Random characters resolve into the final text                |
| **Text Shimmer**          | Continuous light sweep across the text                       |
| **Shimmer Wave**          | 3D wave animation through individual letters                 |
| **Shimmer Wave (colour)** | Colored 3D shimmer wave effect                               |

The available effects and their descriptions are defined directly in the project's `EFFECTS` configuration.

## 🛠️ Customization

### Text Effect

The main text effect supports:

* Character splitting
* Word splitting
* Line splitting

It also provides these presets:

* Fade
* Blur
* Fade-in Blur
* Scale
* Slide

The split and preset controls are available directly in the interface.

## 🖥️ Live Preview

Each generated effect is rendered inside a sandboxed `<iframe>`.

The preview is regenerated whenever the selected effect, text, split mode, or preset changes.

The iframe uses:

```html
sandbox="allow-scripts"
```

This keeps the generated animation isolated from the main application page.

## 📋 Generated Code

For every effect, the application generates a complete standalone HTML document containing:

* HTML structure
* CSS
* JavaScript
* Animation logic

The generated code is displayed inside the code panel and can be copied using the **Copy code** button.

The generated page builder creates the required HTML document structure dynamically.

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/text-effects-lab.git
```

### 2. Open the project

```bash
cd text-effects-lab
```

### 3. Run with Live Server

If you use VS Code:

1. Open the project in VS Code.
2. Install the **Live Server** extension if needed.
3. Open the HTML file.
4. Right-click the file.
5. Select **Open with Live Server**.

You can also open the HTML file directly in a modern browser.

## 📁 Project Structure

```text
text-effects-lab/
│
├── index.html
├── style.css
└── README.md
```

> If the project is currently maintained as a single HTML file, the CSS can remain inside the `<style>` section instead of using `style.css`.

## 🔧 Technologies Used

* HTML5
* CSS3
* Vanilla JavaScript
* CSS Animations
* Web Animations API
* `Intl.Segmenter`
* Clipboard API
* Responsive CSS
* ARIA accessibility attributes
* Sandboxed iframe

No framework or external animation library is required.

## ♿ Accessibility

The project includes several accessibility considerations:

* Keyboard-focus styling
* ARIA labels
* Live status announcements
* Accessible buttons
* Accessible generated-code region
* `prefers-reduced-motion` support

When reduced motion is enabled, animations are disabled or skipped where appropriate.

## 📱 Responsive Design

The interface adapts to smaller screens.

On mobile:

* Sidebar navigation becomes horizontally scrollable.
* Main content receives smaller padding.
* Preview height is reduced.
* Navigation descriptions are hidden.
* Controls adapt to narrow screen widths.

The responsive breakpoints are implemented at `760px` and `400px`.

## 🔒 Input Safety

User-entered text is escaped before being inserted into the generated preview.

The application also limits user input to **3,000 characters** to keep the preview responsive.

## 📋 Clipboard Support

The **Copy code** feature first attempts to use the modern Clipboard API.

If that is unavailable, the application falls back to the legacy `document.execCommand('copy')` approach.

The UI also provides success/failure feedback after the copy operation.

## 🌐 Browser Compatibility

Recommended browsers:

* Google Chrome
* Microsoft Edge
* Mozilla Firefox
* Safari

A fallback is provided when `Intl.Segmenter` is unavailable, allowing the application to continue working with `Array.from()`.

## ⚙️ Performance

To keep the application responsive:

* User input is limited to 3,000 characters.
* Input rebuilding uses a debounce delay.
* Preview content is rendered inside an iframe.
* Text is processed using grapheme-aware splitting where supported.
* Animation timing is controlled using CSS variables and Web APIs.

The current debounce interval is `250ms`.

## 🧪 Testing Checklist

Before deploying the project, test:

* [ ] Every animation loads correctly
* [ ] Custom text works
* [ ] Empty text works
* [ ] Long text is limited correctly
* [ ] Character splitting works
* [ ] Word splitting works
* [ ] Line splitting works
* [ ] Replay works
* [ ] Copy code works
* [ ] Copy failure is handled
* [ ] Emoji and Unicode text works
* [ ] Mobile layout works
* [ ] Keyboard navigation works
* [ ] Reduced-motion mode works
* [ ] No errors appear in the browser console
* [ ] Live Server loads correctly

## 🐛 Troubleshooting

### `Unexpected end of input`

If this error appears:

```text
Uncaught SyntaxError: Unexpected end of input
```

check for:

* Missing `}`
* Missing `)`
* Missing `]`
* Unclosed template literals
* Incorrectly nested `<script>` tags
* Broken generated JavaScript

The current implementation avoids placing literal closing `</script>` tags inside JavaScript strings by constructing them at runtime.

### `favicon.ico 404`

A favicon is already provided as an inline SVG data URI in the current HTML, so the browser does not need a separate `favicon.ico` file.

## 📌 Future Improvements

Possible future additions:

* More text effects
* More animation presets
* Custom animation duration
* Custom delay/stagger controls
* Custom colors
* Font controls
* Export/download generated code
* Shareable effect URLs
* Dark/light themes
* Effect search and filtering
* Code formatting
* Animation timeline controls
* More advanced accessibility options

## 🤝 Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a new branch.

```bash
git checkout -b feature/new-effect
```

3. Make your changes.
4. Test the effect across supported browsers.
5. Commit your changes.

```bash
git commit -m "Add new text effect"
```

6. Push the branch.

```bash
git push origin feature/new-effect
```

7. Open a Pull Request.

## 📄 License

Add your preferred license here.

For example:

```text
MIT License
```

## 👨‍💻 Author

**Bharat Shukla**

Built as an interactive playground for experimenting with modern text animations and reusable frontend animation code.

---

⭐ If you find this project useful, consider giving the repository a star.
