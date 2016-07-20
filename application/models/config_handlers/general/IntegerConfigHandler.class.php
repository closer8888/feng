<?php

  /**
  * Class that handles integer config values
  *
  * @version 1.0
  * @author Ilija Studen <ilija.studen@gmail.com>
  */
  class IntegerConfigHandler extends ConfigHandler {
    
    /**
    * Render form control
    *
    * @param string $control_name
    * @return string
    */
    function render($control_name) {
      return text_field($control_name, $this->getValue(), array('class' => 'short'));
    } // render
    
    /**
    * Conver $value to raw value
    *
    * @param mixed $value
    * @return null
    */
    protected function phpToRaw($value) {
      return (string) $value;
    } // phpToRaw
    
    /**
    * Convert raw value to php
    *
    * @param string $value
    * @return mixed
    */
    protected function rawToPhp($value) {
      return (integer) $value;
    } // rawToPhp
    
  } // IntegerConfigHandler

?>