echo "install app,$1,`basename $1`"
scp -r $1 master@192.168.3.100:/home/master/tmp/
curl 192.168.3.100:9460/install?folder=/home/master/tmp/`basename $1`
