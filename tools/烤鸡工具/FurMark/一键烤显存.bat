@echo off
echo 烤鸡说明：
echo 通过Furmark尽可能给显卡增加负载，以测试显卡显存的稳定性和散热能力是否达标。
echo 提示：烤鸡有风险，图吧工具箱官方不为使用本工具产生的任何后果负责！
echo 烤鸡时间为30分钟，期间可随时关闭。请确保显卡散热和电源供电没有问题，然后按下任意键开始烤鸡。
pause >nul
start FurMark.exe /run_mode=1 /nogui /dyn_camera /width=1024 /height=768 /msaa=8 /max_time=1800000


