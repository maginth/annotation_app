app permettant de taguer du text brute ou html et d'envoyer les tag sous forme de json contenant :

– mot : premier mot de l’annotation (string)
– nocc : numéro de l’occurence du mot (/!\ lowercase avec accent /!\) (le « combientième » mot dans le texte)
– longueur : nombre de mots de l’annotation
– type : par exemple « avocat »

Modifiez le fichier de configuration config.js pour ajouter ou supprimer des catégories d'annotations

L'intégration dans une page se fait en ajoutant le code html de annotation_app_template.html (voir l'exemple)