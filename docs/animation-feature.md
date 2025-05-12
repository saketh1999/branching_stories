# Animation Feature Guide

This document explains how to use the new animation feature that allows you to animate static images in your comic panels using the Minimax.io API.

## Setup

1. You need a Minimax.io API key to use the animation feature.
2. Create or edit your `.env.local` file in the project root and add:
   ```
   MINIMAX_API_KEY=your_minimax_api_key_here
   ```
3. Restart your development server for the changes to take effect.

## How to Use

1. Each image in your comic panels now has an "Animate" button in the bottom right corner.
2. Click this button to generate an animation based on the image.
3. The system will use the original image prompt prefixed with "[Pan right]" to control camera movement.
4. Once generated, the animation will be displayed in place of the static image.
5. You can click "Play Animation" to replay the animation at any time.
6. Use the "Close Video" button to return to the static image view.

## API Details

The animation uses the Minimax.io I2V-01-Director model with the following parameters:

- **API Endpoint**: `https://api.minimax.io/v1/video_generation`
- **Model**: I2V-01-Director
- **Prompt**: Uses the original image prompt prefixed with "[Pan right]" to control camera movement
- **First Frame Image**: Uses the original static image converted to base64

## Camera Movement Directives

You can customize the animation by changing the camera movement directive in the prompt. The default is "[Pan right]" but you can use other options:

- **[Pan right]** - Camera pans from left to right
- **[Pan left]** - Camera pans from right to left
- **[Truck right]** - Camera moves laterally to the right
- **[Truck left]** - Camera moves laterally to the left
- **[Zoom in]** - Camera zooms into the image
- **[Zoom out]** - Camera zooms out from the image

## Common Issues & Troubleshooting

### "API key is not configured" error
- Make sure you've added the MINIMAX_API_KEY to your `.env.local` file
- Restart your Next.js development server after adding the key

### "fetch failed" error
- Check your internet connection
- Verify your API key is correct
- Ensure the Minimax.io API service is available

### "Image too large" error
- Try using smaller images (under 10MB)
- Reduce the resolution of your images before uploading

### "Failed to generate video" error
- The prompt may be too complex - try simplifying it
- The image content might not be suitable for animation - try a different image
- Your Minimax.io account may have usage limits or restrictions

### Slow Performance
- The animation process can take 10-30 seconds depending on server load
- Larger images take longer to process

## Support

If you continue to have issues with the animation feature, please:

1. Check the browser developer console for detailed error messages
2. Verify your Minimax.io account is active and has sufficient credits
3. Contact Minimax.io support if API-specific issues persist 