# PowerShell repository cloning
_Exported on 8/19/2026 at 15:45:50 PDT from Cursor (3.16.29)_

---

**User**

I have a text file containing a list of repository names (all under the same "https://fre-eng-src3.hidglobal.com/scm/dp/" domain). 
I need to create a PowerShell script that clones these repositories into the current directory, with each repository placed in its own folder named after the repository itself. @c:\Users\maxzz\Desktop\extracted_names.txt:1-43 

---

**Cursor**

I'll create a PowerShell script that reads those repo names and clones each one from the HID SCM host into its own folder. Checking the names file first so the script matches the list exactly.

Creating a clone script next to the names file. It will skip folders that already exist and keep going if a clone fails.

Desktop write was skipped, so I’ll put the script in the current project instead.

Updating the default names-file path so it points at your Desktop list and works without extra copies.

The script is at `clone-dp-repos.ps1` in this project. It reads the 43 names from `C:\Users\maxzz\Desktop\extracted_names.txt` and clones each repo from:

`https://fre-eng-src3.hidglobal.com/scm/dp/<name>.git`

into a folder named after that repo in **whatever directory you run it from**. Existing folders are skipped; a failed clone is cleaned up and the script continues.

**Usage**

```powershell
cd C:\path\to\parent\folder
C:\y\w\2-web\0-dp\utils\traytools-26\clone-dp-repos.ps1
```

Or pass a different list:

```powershell
.\clone-dp-repos.ps1 -NamesFile C:\Users\maxzz\Desktop\extracted_names.txt
```

Git will use your existing credentials (Windows Credential Manager / stored Bitbucket login). If a clone fails with 401/403, sign in to that host once with `git`, then re-run the script — already-cloned folders will be skipped.

