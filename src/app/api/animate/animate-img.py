import requests
import json
import base64
import os
import sys
import argparse
import time
from urllib.parse import urlparse

# Your API key is already set
api_key = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJHcm91cE5hbWUiOiJzcmkgc2FpIHNha2V0aCBjaGlsbGFwYWxsaSIsIlVzZXJOYW1lIjoic3JpIHNhaSBzYWtldGggY2hpbGxhcGFsbGkiLCJBY2NvdW50IjoiIiwiU3ViamVjdElEIjoiMTkyMTc4MDk2NzE0NDQyNzkzMiIsIlBob25lIjoiIiwiR3JvdXBJRCI6IjE5MjE3ODA5NjcxNDAyMzM2MjgiLCJQYWdlTmFtZSI6IiIsIk1haWwiOiJzcmlzYWlzYWtldGhjb2RlQGdtYWlsLmNvbSIsIkNyZWF0ZVRpbWUiOiIyMDI1LTA1LTEyIDE1OjAyOjE3IiwiVG9rZW5UeXBlIjoxLCJpc3MiOiJtaW5pbWF4In0.dnjGZhhfC7IOnaiMsg4HwwpVL3VPrypk6RbIfSpIycqBPqeEt3X9ZuoLJkpeRgJ7IZ9DM2kV2p34qUSl2zhGBhTMkkFPVBbrE1UjCz0esm_GPFOz1YDQGCw3PTfKvXn4fCL0RaFrFzm-MSd_Rt25WzyIFSjBLlyo1mlkLVx_1nnsuzI1N3YC21TkXAj94XTmc3w3u_dAO_z13544BbXhqQyk3ZerkVNEg91uz47b944eU87nCUplFL5tNMuWPU2aYYaLzuO1u6nEryAmlp-dUFY_dbD9guKZ-nSSLJ72eoN1wSN8k6BXoiD796hk6A1liSKGI_uhN6XBsF7TjbvzDg"

def query_video_generation(task_id):
    """
    Query the status of a video generation task
    
    Args:
        task_id: The task ID returned by the API
        
    Returns:
        tuple: (file_id, status) - file_id will be empty if not complete
    """
    print(f"Checking status of task: {task_id}")
    url = f"https://api.minimaxi.chat/v1/query/video_generation?task_id={task_id}"
    headers = {
      'authorization': f'Bearer {api_key}'
    }
    
    try:
        response = requests.request("GET", url, headers=headers)
        response_data = response.json()
        
        if 'status' not in response_data:
            print(f"Unexpected response: {json.dumps(response_data, indent=2)}")
            return "", "Unknown"
            
        status = response_data['status']
        
        if status == 'Preparing':
            print("...Preparing...")
            return "", 'Preparing'
        elif status == 'Queueing':
            print("...In the queue...")
            return "", 'Queueing'
        elif status == 'Processing':
            print("...Generating video...")
            return "", 'Processing'
        elif status == 'Success':
            print("...Generation complete!")
            return response_data['file_id'], "Success"
        elif status == 'Fail':
            print(f"...Generation failed: {response_data.get('message', 'No error message')}")
            return "", "Fail"
        else:
            print(f"...Unknown status: {status}")
            return "", "Unknown"
    except Exception as e:
        print(f"Error checking task status: {e}")
        return "", "Error"

def fetch_video_result(file_id, output_file_name=None):
    """
    Fetch and save a generated video file
    
    Args:
        file_id: The file ID returned when task is complete
        output_file_name: The filename to save the video to (optional)
        
    Returns:
        str: The path to the saved video or download URL if not saved
    """
    print("-"*50)
    print("Video generated successfully, retrieving download link")
    url = f"https://api.minimaxi.chat/v1/files/retrieve?file_id={file_id}"
    headers = {
        'authorization': f'Bearer {api_key}',
    }

    try:
        response = requests.request("GET", url, headers=headers)
        response_data = response.json()
        
        if 'file' not in response_data or 'download_url' not in response_data['file']:
            print(f"Unexpected response: {json.dumps(response_data, indent=2)}")
            return None
            
        download_url = response_data['file']['download_url']
        print(f"Video download link: {download_url}")
        
        if output_file_name:
            print(f"Downloading video to {output_file_name}...")
            with open(output_file_name, 'wb') as f:
                f.write(requests.get(download_url).content)
            print(f"Video saved to: {os.path.abspath(output_file_name)}")
            return os.path.abspath(output_file_name)
        
        return download_url
    except Exception as e:
        print(f"Error retrieving video: {e}")
        return None

def generate_video_from_image(image_path, prompt, save_video=False):
    """
    Generate a video from an image using the Minimax API
    
    Args:
        image_path: Path to the image file
        prompt: Prompt for video generation
        save_video: Whether to save the video
        
    Returns:
        str: The path to the saved video or download URL if not saved
    """
    # Verify image exists
    if not os.path.exists(image_path):
        print(f"Error: Image file not found at {image_path}")
        return None
    
    # Get image type from file extension
    _, ext = os.path.splitext(image_path)
    ext = ext.lstrip('.').lower()
    
    if ext not in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
        print(f"Warning: Unrecognized image format '{ext}'. Defaulting to jpeg.")
        ext = 'jpeg'
    
    # Load and encode the image
    try:
        with open(image_path, "rb") as image_file:
            data = base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        print(f"Error reading image file: {e}")
        return None
    
    # API endpoint
    url = "https://api.minimaxi.chat/v1/video_generation"
    
    # Prepare the payload
    payload = json.dumps({
        "model": "I2V-01-Director",
        "prompt": prompt,
        "first_frame_image": f"data:image/{ext};base64,{data}"
    })
    
    # Set headers
    headers = {
        'authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    
    print("-"*50)
    print(f"Submitting request to Minimax API...")
    print(f"Image: {image_path}")
    print(f"Prompt: {prompt}")
    
    try:
        # Make the API request
        response = requests.request("POST", url, headers=headers, data=payload)
        
        # Print response
        print("\nAPI Response:")
        response_data = response.json()
        print(json.dumps(response_data, indent=2))
        
        # Handle video URL if present
        if 'video_url' in response_data:
            video_url = response_data['video_url']
            print(f"\nSuccess! Video URL: {video_url}")
            
            # Save video if requested
            if save_video:
                output_file = f"minimax_video_{os.path.basename(image_path).split('.')[0]}.mp4"
                print(f"Downloading video to {output_file}...")
                
                try:
                    video_response = requests.get(video_url)
                    with open(output_file, 'wb') as f:
                        f.write(video_response.content)
                    print(f"Video saved successfully to {os.path.abspath(output_file)}")
                    return os.path.abspath(output_file)
                except Exception as e:
                    print(f"Error saving video: {e}")
            
            return video_url
            
        elif 'task_id' in response_data:
            task_id = response_data['task_id']
            print(f"\nTask submitted successfully. Task ID: {task_id}")
            print("Polling for task completion...")
            
            max_attempts = 30  # Maximum number of polling attempts
            attempt = 0
            
            # Poll for task completion
            while attempt < max_attempts:
                attempt += 1
                time.sleep(10)  # Wait 10 seconds between polling attempts
                
                file_id, status = query_video_generation(task_id)
                
                if file_id:
                    # Task completed successfully, fetch the video
                    output_file = f"minimax_video_{os.path.basename(image_path).split('.')[0]}.mp4" if save_video else None
                    result = fetch_video_result(file_id, output_file)
                    print("-"*50)
                    print("Video generation successful!")
                    return result
                
                elif status in ["Fail", "Unknown", "Error"]:
                    print("-"*50)
                    print("Video generation failed.")
                    return None
                
                # Continue polling for the remaining statuses
            
            print("Maximum polling attempts reached. Please check task status manually.")
            return None
        
        else:
            print("Unexpected response format. No video_url or task_id found.")
            return None
    
    except requests.exceptions.RequestException as e:
        print(f"Error making API request: {e}")
    except json.JSONDecodeError:
        print(f"Error parsing API response: {response.text}")
    except Exception as e:
        print(f"Unexpected error: {e}")
    
    return None

def main():
    # Set up command line arguments
    parser = argparse.ArgumentParser(description='Generate a video from an image using Minimax API')
    parser.add_argument('image_path', help='Path to the image file')
    parser.add_argument('--prompt', default='[Pan right]A detailed scene', 
                        help='Prompt for video generation (default: "[Pan right]A detailed scene")')
    parser.add_argument('--save_video', action='store_true', 
                        help='Save the video if a URL is returned')
    parser.add_argument('--polling_interval', type=int, default=10,
                        help='Seconds to wait between polling attempts (default: 10)')
    
    args = parser.parse_args()
    
    # Generate video from image
    result = generate_video_from_image(args.image_path, args.prompt, args.save_video)
    
    if result:
        if os.path.exists(result):
            print(f"Video saved to: {result}")
        else:
            print(f"Video URL: {result}")
    else:
        print("Video generation failed or was not completed.")

if __name__ == "__main__":
    main()