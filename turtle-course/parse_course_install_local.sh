#echo "parse course,$1,$2"
CID=`curl "127.0.0.1:3000/course?chapter=$2&subject=$1"`
echo "parse compelted,id=$CID"
if [ ! -z "$CID" ]; then
	./install_local.sh out/$CID
else
	echo "course parse failed,$2"
fi
