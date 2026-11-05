extends Control

@onready var base = $Base
@onready var stick = $Stick
@export var radius := 100.0
@onready var script_name = get_script().resource_path.get_file()
var disabled = false
signal onUpdateJoystick(direction: Vector2)
signal onStopMotion

var direction := Vector2.ZERO
var center := Vector2.ZERO
var finger := -1
var mouse_pressed := false
# Variables para mover con teclado(WASD)
var KeyUp := false
var KeyLeft = false
var KeyDown = false
var KeyRight = false

func _ready():
	center = base.size / 2
	stick.position = center - stick.size / 2

func update_joystick(screen_position: Vector2):
	var local = screen_position - global_position
	var offset = local - center
	if offset.length() > radius:
		offset = offset.normalized() * radius
	stick.position = center + offset - stick.size / 2
	direction = offset / radius
	onUpdateJoystick.emit(direction)

func update_joystick_keys():
	direction = Vector2.ZERO
	if KeyUp:
		direction.y = -1
	elif KeyDown:
		direction.y = 1
	if KeyLeft:
		direction.x = -1
	elif KeyRight:
		direction.x = 1
	onUpdateJoystick.emit(direction)
	if direction.y == -1:
		if direction.x == 1:
			stick.position = Vector2(142, 29) # ↗
		elif direction.x == -1:
			stick.position = Vector2(27, 33) # ↖
		else:
			stick.position = Vector2(85, 7) # ↑
	elif direction.y == 1:
		if direction.x == 1:
			stick.position = Vector2(143, 143) # ↘
		elif direction.x == -1:
			stick.position = Vector2(29, 143) # ↙
		else:
			stick.position = Vector2(85, 167) # ↓
	elif direction.x == 1:
		stick.position = Vector2(167, 88) # →
	elif direction.x == -1:
		stick.position = Vector2(7, 84) # ←
	else:
		reset_joystick()

func reset_joystick():
	stick.position = center - stick.size / 2
	direction = Vector2.ZERO
	onStopMotion.emit()

func _input(event):
	if disabled:
		stick.position = center - stick.size / 2
		direction = Vector2.ZERO
		return
	# Para detectar el dedo (en Android)
	if event is InputEventScreenTouch:
		if event.pressed:
			if finger == -1:
				var local = event.position - global_position
				if local.distance_to(center) <= radius:
					finger = event.index
		else:
			if event.index == finger:
				finger = -1
				reset_joystick()
	if event is InputEventScreenDrag:
		if event.index == finger:
			update_joystick(event.position)
	# Para detectar Mouse(para debuggear en PC)
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT: # Que solo se presione con el click izquierdo
			if event.pressed:
				var local = event.position - global_position
				if local.distance_to(center) <= radius:
					mouse_pressed = true
			else:
				mouse_pressed = false
				reset_joystick()
	if event is InputEventMouseMotion:
		if mouse_pressed:
			update_joystick(event.position)
	if event is InputEventKey and not mouse_pressed: # Solo se puede usar las teclas si no se usa el Mouse
		if event.pressed:
			match event.keycode:
				KEY_W:
					KeyUp = true
					update_joystick_keys()
				KEY_A:
					KeyLeft = true
					update_joystick_keys()
				KEY_S:
					KeyDown = true
					update_joystick_keys()
				KEY_D:
					KeyRight = true
					update_joystick_keys()
		else:
			match event.keycode:
				KEY_W:
					KeyUp = false
					update_joystick_keys()
				KEY_A:
					KeyLeft = false
					update_joystick_keys()
				KEY_S:
					KeyDown = false
					update_joystick_keys()
				KEY_D:
					KeyRight = false
					update_joystick_keys()

var joystick_moving := false
func _on_on_update_joystick(direction: Vector2) -> void:
	if direction != Vector2.ZERO and not joystick_moving:
		joystick_moving = true
		print(script_name + ": Joystick Moved")

func _on_on_stop_motion() -> void:
	if joystick_moving:
		joystick_moving = false
		print(script_name + ": Joystick stopped")
