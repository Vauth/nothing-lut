# NothingLut - Cinematic Color Processor

<br>

## Overview

**NothingLut** is a web-based color grading tool. It allows users to apply highly detailed, real-time color corrections to images or live camera feeds (on supported devices) and export the final look as a standard **.CUBE Look-Up Table (LUT)** file for use for Nothing Phone Cameras.
A unique feature is the integrated **AI Generator**, powered by the Gemini API, which creates complex color filters based on descriptive text prompts.

<br>

## Key Features

* **Real-time Processing:** Apply filter effects instantly to uploaded images or live camera input (requires modern browser/HTTPS).
* **Gemini AI Integration:** Generate custom filter parameters using descriptive prompts like "Vintage 1980s polaroid" or "Moody cinematic horror." 
* **Nothing Mono Mode:** Instantly isolate and enhance the **Red** channel while desaturating the rest, mimicking the unique Nothing OS aesthetic.
* **Advanced Control:** Fine-tune the image with comprehensive controls including **Exposure, Contrast, Gamma, Split Toning** (Shadows/Highlights tint), and **Vibrance**.
* **LUT Export:** Export your final custom look as a 33x33x33 **.CUBE LUT** file, compatible with virtually all professional video and photo editors.

<br>

## How to Use

### 1. Load an Image or Go Live

* Click the **"File Load"** button (up arrow icon) to upload a photo from your device.
* Click the **"Camera Toggle"** button (camera icon) to start the live feed from your device's camera.

### 2. Basic Grading

Use the **Basic** tab for quick adjustments:
* Use **Exposure** and **Contrast** for foundational light correction.
* Use **Saturation** to control color intensity.
* Toggle **Nothing Mono** to apply the signature aesthetic.

### 3. AI Generation

1.  Click the **"Ask AI"** button (lightning bolt icon).
2.  Paste your **Gemini API Key** into the required field (you can get one from the link provided in the modal).
3.  Enter a detailed prompt describing the desired aesthetic (e.g., "Dark, moody teal and orange look for a night scene").
4.  Click **"Generate Filter"**. The AI will return a complete set of values for the controls, instantly applying the look to your image.

### 4. Export the Look

1.  Switch to the **Save** tab.
2.  Enter a name for your filter in the `Filter Name` field (e.g., `CYBERPUNK_NIGHT`).
3.  Click **"Download .CUBE"** to generate and save the professional LUT file.
4.  Alternatively, click **"Save Image"** to download the currently visible, processed image as a PNG.

<br>

<br>

## Live Demo
Check out the live demo [here](https://vauth.github.io/nothing-lut).

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
