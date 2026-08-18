	TODO: tools registry item: update  Platform to the cycled button
	TODO: tools registry tabs: toolbar menu to file Menu and add menu for Tools
	
	08.05.26
	DpAgentOtsPlugin.dll
	TODO: copy ops: in report if folder has no changes and only subfolders without changes then it should be collapsed
	TODO: copy ops: add additional folder to exclude like build/bin/traytools.exe and from .gitignore
		//error message during sync operation:
		//sync copy "build\\bin\\traytools-26.exe": copy file "C:\\y\\w\\2-web\\0-dp\\utils\\traytools-26\\build\\bin\\traytools-26.exe": open C:\y\c\dp\tm-bitbucket\traytools-26\build\bin\traytools-26.exe: The process cannot access the file because it is being used by another process.
		//   and it is now clear what happens to the rest of files
		//       it looks like the whole process was canceled and it is not right
		//   probably it should be sipped because locked and the rest are in sync
	TODO: copy ops: report should include itemized message (i.e. how many of each) instead of "Total: 683 files in 30 foldersLegend: A = add, M = modify, D = delete"
	
	TODO: any tabs tree: show unsaved marker as button which ckicking will save
	TODO: any tabs quick view: if folder is collapsed then it should be collapsed in quick view
	TODO: any tree: right click context menu (one menu for the whole tree but the contents depends on the clicked item)
	TODO: any tree: double click on item to edit name
	TODO: any tree: if first work separated with ":" then show left part slightly gray
	TODO: tools editor: action "C:\Program Files (x86)\DigitalPersona\Bin\DpoTrain.dll" cannot be executed but we want to open folder and select item

	
	TODO: expandable is string with env. macro %%
	
	TODO: in "Registry" do we need icon write at the right side and do we need read icon there?
	TODO: when copy skipped in Copy Ops show icon check instead of info icon
	TODO: registry: add new type of item: swap two keys for dptrace key will specify two keys that should exchange their names
	
	DpAgentOtsPlugin.dll
		07.26.26
			tools menu editor: 
				* TODO: if path is folder then open this folder not the parent folder as it is now
				* TODO: for command it is not clear it is command or file if we want to open folder but with selected file (command in menu will not work in this case)
				
				* TODO: add operations import/export
				* TODO: find the for predefined presets
			app mini view
				* TODO: fix scrollbars in mini state
				* TODO: fix mini state icon

		07.27.26
			TODO: Double click on quick list items opens this item and we need history
			TODO: Tools tab: quick list text in row should be as button but double click in one row
			TODO: Tools tab: command: execute command as reveal item or open folder (or two buttons "Execute" and "Reveal")
			TODO: checkbox "Folder" open as folder or navigate to file

		07.24.26
			TODO: add column 64/32 in report; when create copy operation and folder is 32 then add 32
			TODO: add button set destination folder for each copy item in group (excluding group items)
			TODO: make mini icon in illustrator instead of temporary as it is now
		
		07.28.26
			TODO: fix HotKey control rounding and buttons size as for Command field
			TODO: it looks like global hotkeys are not assigned and key conflicts are not shown in notice.info
			
		07.30.26
			TODO: update for "sync" tab report section to show source and dest folders; update icons and icon colors
	
		07.23.26
			TODO: different message for windows 1x1; diff color for "off-screen" and "empty bounds"
			TODO: windows: place options (hide windows wo/ children i.e. listener windows) in popover

		08.03.26
			registry:
				TODO: show N of total files and N of changed files
				TODO: to the tree root add filename.json and changed state and info icon and save icon next to hamburger menu
				TODO: registry "Key path" input open button needs to check elevation and use HKEY_CURRENT_USER instead of HKCU (this check should be done on the Go side)
				TODO: remove placeholders 
				
			TODO: dpagent monitor add small red dot as beakon when active and check rerenders (menu is on rerender path. why?)
			TODO: when main window minimized then icon should be taken away from taskbar and next click on trayicon should show the window (now it is the second click)
		
		LONG STANDING:
			TODO: clean up empty folders from temp dir
			TODO: clean up trace files; broadcast un-hook message when agent stopped
			TODO: switch trace folder
			TODO: stop DpAgent stops only 32 bit process
			TODO: processes, dpagent running processes with mark wo/ threads, and regitry predefined keys
			TODO: utility to coy files with attrs but exclude node_modules, and before delete destination contents

	trace-viewer-26-go
		06.29.26
		TODO: Update project filters
