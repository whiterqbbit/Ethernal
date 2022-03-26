import pixelgrid from "pixel-grid";
import Klon from "./klon";

/**
 * Classe de la Grille
 */
export default class Grid {
  /**
   * Le constructeur de la classe Grid
   * @param {nombre de colonnes pour la grille} nbColumns
   * @param {nombre de ligne pour la grille} nbRows
   * @param {les options pour } options
   * @throws {erreur si dimensions non transmises}
   */
  constructor(
    nbColumns,
    nbRows,
    options = {
      size: 15,
      padding: 1,
      background: [0, 0, 0],
      formatted: true,
    }
  ) {
    if (!nbColumns || !nbRows)
      throw new Error("Grid constructor needs number of columns and rows");
    this.nbColumns = nbColumns;
    this.nbRows = nbRows;
    this.options = options;

    // la future instance de PixelGrid
    this.pixels = null;

    // Initialisation des tableaux avec le noise (en-dessous) et les dessins au-dessus
    this.noises = Array.from(
      { length: this.length },
      () => new Klon([0, 0, 0])
    );
    this.persistent = new Array(this.length);
  }

  /**
   * Getter permettant de récupérer la taille du tableau
   * @returns {le facteur du nombre de colonnes et lignes}
   */
  get length() {
    return this.nbColumns * this.nbRows;
  }

  /**
   * Getter permettant de récupérer le tableau de pixels
   * @returns {le tableau de pixels persistant}
   */
  getPersistent() {
    return this.persistent;
  }

  /**
   * Initialise PixelGrid
   * @param {l'élement du DOM dans lequel est affiché pixel} root
   */
  initialize(root, width = "100%") {
    this.pixels = pixelgrid(
      this.noises.map((klon) => klon.color),
      {
        rows: this.nbRows,
        columns: this.nbColumns,
        root,
        ...this.options,
      }
    );
    this.pixels.canvas.style.width = width;

    let frameCounter = 0;
    this.pixels.frame(() => {
      frameCounter++;
      if (!(frameCounter % 5 === 0)) return;
      let data = [];
      for (let i = 0; i < this.length; i++) {
        // Pour chaque klon si il y a une couleur on prend la couleur sinon un gris aléatoire
        data[i] = this.persistent[i]
          ? this.persistent[i].color
          : i < 157
          ? this.noises[i].randGray().color
          : data[i % 157];
      }
      this.pixels.update(data);
    });
  }

  draw_pixel(x, y, klon) {
    var pos = y * this.nbColumns + x;
    if (this.persistent[pos] ? this.persistent[pos].isEditable : true)
      this.persistent[pos] = klon;
  }

  erase_pixel(x, y) {
    var pos = y * this.nbColumns + x;
    if (this.persistent[pos] ? this.persistent[pos].isEditable : true)
      this.persistent[pos] = undefined;
  }

  convertIndexToXY(number) {
    let x = number % this.nbColumns;
    let y = Math.floor(number / this.nbColumns);
    return { x, y };
  }

  convertXYToIndex(x, y) {
    return y * this.nbColumns + x;
  }
}