crs=$(CRS_VERSIONS)
cd /crs
echo "CRS versions: ${CRS_VERSIONS}"
for i in "${stringarray[@]}"
do
  :
  echo "Preparing CRS $i"
  rm -rf $i/
  git clone https://github.com/coreruleset/coreruleset -b $i
done