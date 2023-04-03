pyinstaller -F --paths $CONDA_PREFIX --add-data "minerva_analysis/client:minerva_analysis/client" --add-data "minerva_analysis/__init__.py:minerva_analysis/" --add-data "minerva_analysis/server:minerva_analysis/server" --add-data "$CONDA_PREFIX/lib/python3.8/site-packages/xmlschema/schemas:xmlschema/schemas" --hidden-import "scipy.spatial.transform._rotation_groups"  --hidden-import "sqlalchemy.sql.default_comparator"  --hidden-import "sklearn.metrics._pairwise_distances_reduction._datasets_pair" --hidden-import "sklearn.neighbors._partition_nodes" --hidden-import "sklearn.metrics._pairwise_distances_reduction._datasets_pair" --hidden-import cmath --collect-submodules "sklearn.utils" --name $1 run.py
