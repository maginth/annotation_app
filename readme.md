Regarder [l'exemple](http://aekuo.com/mathieu/doctrine/exemple.html)

Il s'agit d'une petite app permettant de taguer du text brute ou html en le surlignant et d'envoyer la liste de tag sous forme de json contenant :

– mot : premier mot de l’annotation (string)

– nocc : numéro de l’occurence du mot (/!\\ lowercase avec accent /!\\) (le « combientième » mot dans le texte)

– longueur : nombre de mots de l’annotation

– type : par exemple « avocat »

Modifiez le fichier de configuration annotation_app/config.js pour ajouter ou supprimer des catégories d'annotations

L'intégration dans une page se fait simplement en insérant le code html de annotation_app_template.html dans la page (voir l'exemple) et en copiant le dossier annotation_app à côté de la page