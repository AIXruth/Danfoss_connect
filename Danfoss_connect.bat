set /p T="Which temperature do you want (press enter to output current settings)?"
node .\Danfoss_connect.js %T%
pause