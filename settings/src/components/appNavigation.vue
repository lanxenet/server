<template>
	<div id="app-navigation">
		<div class="app-navigation-new" v-if="menu.new">
			<button type="button" id="new-user-button" :class="menu.new.icon">{{menu.new.text}}</button>
		</div>
		<ul :id="menu.id">
			<navigation-item v-for="(item, key) in menu.items" :item="item" :key="key" />
		</ul>
	</div>
</template>

<script>
import navigationItem from './appNavigation/navigationItem';

export default {
	name: 'appNavigation',
	props: ['menu'],
	components: {
		navigationItem
	}
}
</script>
