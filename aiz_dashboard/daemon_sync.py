import time
import subprocess
import sys
import os

# Path to the sync script
sync_script = '/usr/local/google/home/jameszpark/aiz_dashboard/sync_data.py'
static_dir = '/usr/local/google/home/jameszpark/aiz_dashboard/static'

def get_last_modified():
    # Return the maximum mtime of files in static_dir (excluding data.js/data.json)
    mtimes = []
    if not os.path.exists(static_dir):
        return 0
    for entry in os.scandir(static_dir):
        if entry.is_file() and entry.name not in ('data.js', 'data.json'):
            mtimes.append(entry.stat().st_mtime)
    return max(mtimes) if mtimes else 0

def main():
    print("Starting sync daemon...")
    last_mtime = get_last_modified()
    last_hourly_sync = time.time()
    
    # Run initial sync on startup
    try:
        print("Triggering initial synchronization...")
        subprocess.run(["python3", sync_script], check=True)
    except Exception as e:
        print(f"Sync error: {e}", file=sys.stderr)

    while True:
        try:
            current_time = time.time()
            current_mtime = get_last_modified()
            
            # Trigger sync if any watched files changed, OR if 1 hour has passed since last sync
            if current_mtime > last_mtime or (current_time - last_hourly_sync) >= 3600:
                if current_mtime > last_mtime:
                    print("Detected file modification, triggering synchronization...")
                else:
                    print("1 hour elapsed, triggering periodic synchronization...")
                
                subprocess.run(["python3", sync_script], check=True)
                last_mtime = current_mtime
                last_hourly_sync = current_time
                
        except Exception as e:
            print(f"Sync error: {e}", file=sys.stderr)
        
        # Sleep for 5 seconds between checks
        time.sleep(5)

if __name__ == '__main__':
    main()
