function AIManager(GameManager) {
	this.world = GameManager;
	this.ticker = 0;

	this.mixWeights();
}

// Reset state.
AIManager.prototype.reset = function () {
	// Reset the ticker.
	if (this.ticker) {
		window.clearTimeout(this.ticker);
		this.ticker = 0;
	}
}

// Randomise weights.
AIManager.prototype.mixWeights = function () {
	this.lookahead = Math.floor(Math.random() * 4);

	var a1weight = Math.random();
	this.weights = {
		"a1": a1weight,
		"a2": 1 - a1weight
	}
}

// Serialize weights.
AIManager.prototype.serialize = function () {
	var self = this;
	var score = self.world.score;

	return JSON.stringify({
		"count": 1,
		"lookahead": self.lookahead,
		"weights": self.weights,
		"score": score,
		"bestScore": score
	});
}

// Learn from the last game.
AIManager.prototype.learn = function () {
	var self = this;
	var storage = this.world.storageManager;

	var brain = storage.get('aibrain');
	if (brain) {
		brain = JSON.parse(brain);
	} else {
		brain = [];
	}

	// Right, first we want to see what the score was
	// the last time we used these weights.
	var found = false;
	var game;
	for (var i = 0; i < brain.length; i++) {
		game = brain[i];
		if (game && game.lookahead == self.lookahead && game.weights.a1 == self.weights.a1
			&& game.weights.a2 == self.weights.a2) {
			// Game matches values for this round, re-score this one.
			game.score = (game.score + self.world.score) / game.count;
			if (!game.bestScore || self.world.score > game.bestScore) {
				game.bestScore = self.world.score;
			}
			game.count++;
			found = true;
			brain[i] = game;
			break;
		}
	}

	// Add to brain if we didnt find it.
	if (!found) {
		game = self.serialize();
		brain.push(game);
	}

	// If we have tried these weights more than 10 times,
	// produce a random variation.
	if (game.count >= 10) {
		if (brain.length > 10) {
			// TODO - mix weights based on the best
			// game from the previous 10 sets.
			// This is how a GA works - improve the
			// best ones.
			// But do slightly bias this so we still *try*
			// some variations of the previous weights.
		}
		self.mixWeights();
	}

	// Save the brain.
	storage.set('aibrain', JSON.stringify(brain));
	console.log(brain);
}

// Clones a grid's tiles into a simple cell array.
AIManager.prototype.simpleGridClone = function (grid) {
	var cells = [];
	for (var x = 0; x < grid.size; x++) {
		var row = cells[x] = [];
		for (var y = 0; y < grid.size; y++) {
			var tile = grid.cells[x][y];
			if (tile) {
				tile = tile.value;
			}
			row[y] = tile;
		}
	}
}

// Performs a fake movement on a grid.
AIManager.prototype.performMove = function (grid, direction) {
	var cells = this.simpleGridClone(grid);
	var newGrid = new Grid(grid.size, cells);
	var move = this.world.performMove(newGrid, direction);
	return {
		"result": move,
		"grid": newGrid
	};
}

// Grabs the score for a grid, with the given
// movement vector implemented.
AIManager.prototype.scoreMove = function (grid, direction) {
	var move = this.performMove(grid, direction);
	return move.result.score;
}

// Looks ahead, and grabs the highest score for
// any valid move, if the current move were to
// affect the grid.
AIManager.prototype.lookAhead = function (grid, direction, lookahead) {
	var world = this.performMove(grid, direction);
	var move = this.getMove(world.grid, 0, lookahead);
	return {
		"grid": world.grid,
		"score": move.score
	};
}

// Gets any direction we can move.
AIManager.prototype.getPossibleMoves = function (grid) {
	var self = this;
	var world = this.world;
	var moves = [0, 0, 0, 0];

	for (var x = 0; x < grid.size; x++) {
		for (var y = 0; y < grid.size; y++) {
			var tile = grid.cellContent({ x: x, y: y });
			if (tile) {
				for (var direction = 0; direction < 4; direction++) {
					var vector = world.getVector(direction);
					var cell   = { x: x + vector.x, y: y + vector.y };

					var other  = grid.cellContent(cell);
					if ((!other && grid.withinBounds(cell)) || (other && other.value == tile.value)) {
						moves[direction] = 1;
					}
				}
			}
		}
	}

	return moves;
}

// Gets any possible move.
AIManager.prototype.getDefaultMove = function (grid) {
	var moves = this.getPossibleMoves(grid);
	for (var direction = 0; direction < 4; direction++) {
		if (moves[direction]) {
			return direction;
		}
	}
	return -1;
}

// Gets the best possible move.
AIManager.prototype.getMove = function (grid, lookahead) {
	var self = this;
	var world = this.world;

	var score = 0;
	var dir = this.getDefaultMove(grid);

	var possibles = this.getPossibleMoves(grid);

	var algorithm = Math.random();

	if (algorithm < this.weights.a1) {
		// Algorithm 1 - returns the move that will merge the
		// highest two tiles.
		for (var x = 0; x < world.size; x++) {
			for (var y = 0; y < world.size; y++) {
				var tile = grid.cellContent({ x: x, y: y });

				if (tile) {
					for (var direction = 0; direction < 4; direction++) {
						var vector = world.getVector(direction);
						var cell   = { x: x + vector.x, y: y + vector.y };

						var other  = grid.cellContent(cell);

						if (other && other.value === tile.value) {
							if (tile.value * 2 > score) {
								score = tile * 2;
								dir = direction;
							}
						}
					}
				}
			}
		}
	} else {
		// Algorithm 2 - returns the move that will produce
		// the highest scoring world.
		if (algorithm >= this.weights.a2) {
			for (var direction = 0; direction < 4; direction++) {
				if (possibles[direction]) {
					var possible = this.scoreMove(world.grid, direction);

					if (possible >= score) {
						score = possible;
						dir = direction;
					}
				}
			}
		}
	}

	// Algorithm 3 - returns the move that will produce
	// the highest scoring round after the next {lookahead}
	// rounds.
	if (lookahead > 0) {
		var nextScore = 0;
		for (var direction = 0; direction < 4; direction++) {
			if (possibles[direction]) {
				var lookaheadMove = self.lookAhead(grid, direction, lookahead - 1);
				if (lookaheadMove.score > nextScore) {
					dir = direction;
					nextScore = lookaheadMove.score;
				}
			}
		}
	}

	return {
		"direction": dir,
		"score": score
	};
}

// Called every 1 second after the game has begun.
AIManager.prototype.tick = function () {
	var self = this;

	// Get the highest scoring move.
	var move = this.getMove(this.world.grid, this.lookahead);
	var direction = move.direction;

	// Perform the move or end the game.
	if (direction == -1) {
		return;
	}

	this.world.move(direction);

	// Tick again in one second if the game isnt over yet.
	if (!this.world.isGameTerminated()) {
		this.ticker = window.setTimeout(function() {
			self.tick();
		}, 400);
	}
}

// Called when the game has begun.
AIManager.prototype.onStart = function () {
	this.reset();
	this.tick();
}

// Called when the game has ended.
AIManager.prototype.onEnd = function (manager) {
	this.world = manager;

	this.learn();
	this.reset();

	window.setTimeout(function() {
		manager.restart();
	}, 1000);
}
