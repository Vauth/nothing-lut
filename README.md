# LUTai - AI Color Grading Generator
LUTai is a static web application that generates cinematic 3D LUTs (Look Up Tables) from natural language descriptions. It uses the Google Gemini API to translate mood and lighting prompts into precise color grading parameters, including ASC-CDL, white balance, and split toning.

<br>

## Features
- **Text-to-LUT:** Describe a look (e.g., "Bleak Russian winter", "Warm golden hour") and the AI generates the color math.
- **Real-time Preview:** Upload your own reference image to see the grade applied instantly.
- **Advanced Color Science:** Manipulates exposure, contrast, saturation, temperature, tint, lift, gamma, gain, and split toning.
- **Universal Export:** Downloads standard .CUBE files compatible with DaVinci Resolve, Adobe Premiere Pro, Final Cut Pro, and OBS.
- **Privacy Focused:** Runs entirely in the browser. Your images are never uploaded to a server; only the text prompt is sent to the AI.

<br>

## Getting an API Key
- Go to Google AI Studio.
- Create a free API Key.
- Paste the key into the LUTai interface when prompted.
- The key is used temporarily within your browser session to fetch parameters.

<br>

## Browser Support
This project uses modern JavaScript (ES6+) and Canvas APIs. It works best in Chrome, Firefox, Safari, and Edge.

<br>

## Live Demo
Check out the live demo [here](https://vauth.github.io/lutai).

<br>

## License

```
MIT License

Copyright (c) 2025 Vauth

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
