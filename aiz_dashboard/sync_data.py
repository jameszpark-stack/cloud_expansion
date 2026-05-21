import os
import shutil
import subprocess
import json

# Target directories
local_static_dir = '/usr/local/google/home/jameszpark/aiz_dashboard/static'
x20_dir = '/google/data/rw/users/ja/jameszpark/aiz_dashboard'

def sync():
    # 1. Fetch latest sheet data
    print("Fetching sheet data...")
    cmd = [
        "/google/bin/releases/gemini-agents-gsheets/gsheets",
        "read",
        "1qjEp-uTPhsaP0ybtaBLuj24y5QO9yrqB381BLSMFCn8",
        "'AIZ Execution Roadmap'!A1:AE",
        "--json"
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        raw_data = json.loads(result.stdout)
        
        if not raw_data:
            print("No data returned from sheet.")
            return
            
        headers = raw_data[0]
        rows = raw_data[1:]
        
        structured_data = []
        for row in rows:
            if len(row) < len(headers):
                row = row + [""] * (len(headers) - len(row))
            row = row[:len(headers)]
            structured_data.append(dict(zip(headers, row)))
            
        # 2. Write data.js locally
        os.makedirs(local_static_dir, exist_ok=True)
        local_data_file = os.path.join(local_static_dir, 'data.js')
        with open(local_data_file, 'w') as f:
            f.write("window.aizData = ")
            json.dump(structured_data, f, indent=2)
            f.write(";\n")
        print(f"Wrote local data to {local_data_file}")
        
        # 3. Create x20 dir and copy all static files + data.js
        os.makedirs(x20_dir, exist_ok=True)
        
        # Files to copy
        files_to_copy = ['index.html', 'styles.css', 'app.js', 'data.js']
        for file in files_to_copy:
            src = os.path.join(local_static_dir, file)
            dest = os.path.join(x20_dir, file)
            shutil.copy2(src, dest)
            print(f"Copied {file} to x20: {dest}")
            
        print("Sync completed successfully!")
        
    except Exception as e:
        print(f"Sync failed: {e}")

if __name__ == '__main__':
    sync()
