node .\Danfoss_connect.js
echo "done1"
set /p T="Which temperature do you want (press enter to output current settings)?"
node .\Danfoss_connect.js %T%
echo "done2"
timeout 5
node .\Danfoss_connect.js
echo "done3"
pause