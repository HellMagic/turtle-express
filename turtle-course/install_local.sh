echo "install app,$1"
scp -r out/$1 master@192.168.3.100:/tmp/
curl 192.168.3.100:9460/install?folder=/tmp/$1
