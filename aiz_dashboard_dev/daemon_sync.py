import time
import subprocess
import sys

# Path to the sync script
sync_script = '/usr/local/google/home/jameszpark/aiz_dashboard_dev/sync_data.py'

def main():
    print("Starting sync daemon...")
    while True:
        try:
            print("Triggering synchronization...")
            subprocess.run(["python3", sync_script], check=True)
        except Exception as e:
            print(f"Sync error: {e}", file=sys.stderr)
        
        # Sleep for 1 hour (3600 seconds)
        print("Sleeping for 1 hour...")
        time.sleep(3600)

if __name__ == '__main__':
    main()
